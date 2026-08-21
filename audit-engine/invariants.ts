import type { CompletionProof, MatchExecutionSnapshot, PlayerMetricHandling, ResultInput, GradedResult, ReasonCode } from "./domain.js";

function completeHandling(playerId: string, metricId: string, handling: PlayerMetricHandling["handling"]): PlayerMetricHandling {
  return { playerId, metricId, status: "COMPLETE", handling };
}

export function missingSymmetricMetricIds(snapshot: MatchExecutionSnapshot): string[] {
  const required = new Set(snapshot.mandatoryMetricIds);
  const p1 = new Set(snapshot.p1Handling.filter((item) => item.status === "COMPLETE").map((item) => item.metricId));
  const p2 = new Set(snapshot.p2Handling.filter((item) => item.status === "COMPLETE").map((item) => item.metricId));
  return [...required].filter((metricId) => !p1.has(metricId) || !p2.has(metricId));
}

export function verifyMatrixFirewall(independentCommittedAt?: string, matrixRevealedAt?: string): { valid: boolean; reasonCodes: ReasonCode[] } {
  if (!independentCommittedAt || !matrixRevealedAt || new Date(matrixRevealedAt).getTime() <= new Date(independentCommittedAt).getTime()) {
    return { valid: false, reasonCodes: ["MATRIX_FIREWALL_VIOLATED"] };
  }
  return { valid: true, reasonCodes: [] };
}

export function calculateCompletion(snapshot: MatchExecutionSnapshot): CompletionProof {
  const reasons = new Set<ReasonCode>(snapshot.reasonCodes);
  const missingMetrics = missingSymmetricMetricIds(snapshot);
  const completedRequirements = new Set(snapshot.requirementExecutions.filter((item) => item.disposition !== "NOT_STARTED").map((item) => item.requirementId));
  if (completedRequirements.size !== 50 || [...completedRequirements].some((requirementId) => requirementId < 1 || requirementId > 50)) reasons.add("VERIFICATION_RULE_UNMAPPED");
  if (missingMetrics.length > 0) reasons.add("METRIC_UNRESOLVED");
  if (!snapshot.identityVerified) reasons.add("MATCH_IDENTITY_UNRESOLVED");
  if (!snapshot.criticalDependenciesResolved) reasons.add("SURFACE_CONFLICT");
  if (!snapshot.matrixFirewallValid) reasons.add("MATRIX_FIREWALL_VIOLATED");
  const counts: Array<[number, number]> = [
    [snapshot.verificationExecuted, snapshot.verificationTotal],
    [snapshot.disagreementExecuted, snapshot.disagreementTotal],
    [snapshot.underdogExecuted, snapshot.underdogTotal],
    [snapshot.stressExecuted, snapshot.stressTotal],
    [snapshot.criticalSourcesExecuted, snapshot.criticalSourcesTotal],
    [snapshot.evidenceFamiliesExecuted, snapshot.evidenceFamiliesTotal],
    [snapshot.reconstructionsExecuted, snapshot.reconstructionsTotal],
  ];
  if (counts.some(([executed, total]) => executed < total)) reasons.add("METRIC_UNRESOLVED");
  if (snapshot.calibrationStatus !== "COMPLETE") reasons.add("METRIC_UNRESOLVED");
  const totalWork = counts.reduce((sum, [executed, total]) => sum + total + executed, 0) + 2;
  const completedWork = counts.reduce((sum, [executed, total]) => sum + Math.min(executed, total) + Math.min(executed, total), 0) + Number(snapshot.identityVerified) + Number(snapshot.criticalDependenciesResolved);
  return { complete: reasons.size === 0, completionPercent: totalWork === 0 ? 0 : Math.round((completedWork / totalWork) * 100), reasonCodes: [...reasons] };
}

export function gradeResult(input: ResultInput): GradedResult {
  if (!input.matchStarted && ["PRE_MATCH_WITHDRAWAL", "WALKOVER", "CANCELLATION"].includes(input.resultType)) {
    return { grade: "NON_GRADED", countedInCalibration: false, masterSequenceAdvances: true };
  }
  if (input.resultType === "IN_MATCH_RETIREMENT" || input.resultType === "COMPLETED_NORMALLY") {
    const grade = input.predictedWinner && input.actualWinner ? input.predictedWinner === input.actualWinner ? "WIN" : "LOSS" : "NON_GRADED";
    return { grade, countedInCalibration: grade !== "NON_GRADED", masterSequenceAdvances: true };
  }
  return { grade: "PASS", countedInCalibration: false, masterSequenceAdvances: true };
}

export { completeHandling };
