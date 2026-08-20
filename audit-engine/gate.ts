import type { AuditColor, MatchExecutionSnapshot, ReasonCode, RequirementDisposition } from "./domain.js";

const ACCEPTED_REQUIREMENT_DISPOSITIONS: readonly RequirementDisposition[] = ["COMPLETE", "PARTIAL", "UNAVAILABLE", "EXCLUDED"];

function allRequirementsComplete(input: MatchExecutionSnapshot): boolean {
  const completed = new Set(input.requirementExecutions.filter((item) => ACCEPTED_REQUIREMENT_DISPOSITIONS.includes(item.disposition)).map((item) => item.requirementId));
  return completed.size === 50 && [...completed].every((requirementId) => requirementId >= 1 && requirementId <= 50);
}

export interface GreenGateInput extends MatchExecutionSnapshot {
  effectiveIndependentEvidenceCount: number;
  requiredGreenEvidenceFamilies: number;
  matrixRemovalStable: boolean;
  strongestFamilyRemovalStable: boolean;
  dangerousUnderdogClear: boolean;
  unresolvedCriticalContradictions: number;
  auditVeto?: "RED_VETO" | "PASS_VETO";
}

function allExecutionSectionsComplete(input: MatchExecutionSnapshot): boolean {
  const sections: Array<[number, number]> = [
    [input.verificationExecuted, input.verificationTotal],
    [input.disagreementExecuted, input.disagreementTotal],
    [input.underdogExecuted, input.underdogTotal],
    [input.stressExecuted, input.stressTotal],
    [input.criticalSourcesExecuted, input.criticalSourcesTotal],
    [input.evidenceFamiliesExecuted, input.evidenceFamiliesTotal],
    [input.reconstructionsExecuted, input.reconstructionsTotal],
  ];
  return sections.every(([executed, total]) => executed >= total);
}

export interface GreenGateResult {
  color: AuditColor;
  reasonCodes: readonly ReasonCode[];
}

export function evaluateFinalColor(input: GreenGateInput): GreenGateResult {
  const reasons = new Set<ReasonCode>();
  const proof = input.matrixFirewallValid;
  const complete = allRequirementsComplete(input) && allExecutionSectionsComplete(input) && input.calibrationStatus === "COMPLETE" && input.identityVerified && input.criticalDependenciesResolved && proof && input.dangerousUnderdogClear && input.matrixRemovalStable && input.strongestFamilyRemovalStable && input.effectiveIndependentEvidenceCount >= input.requiredGreenEvidenceFamilies && input.unresolvedCriticalContradictions === 0;
  if (!proof) reasons.add("MATRIX_FIREWALL_VIOLATED");
  if (!input.matrixRemovalStable) reasons.add("GREEN_LOCKED");
  if (!input.dangerousUnderdogClear) reasons.add("GREEN_LOCKED");
  if (!allExecutionSectionsComplete(input) || input.calibrationStatus !== "COMPLETE") reasons.add("METRIC_UNRESOLVED");
  if (!allRequirementsComplete(input)) reasons.add("VERIFICATION_RULE_UNMAPPED");
  if (input.effectiveIndependentEvidenceCount < input.requiredGreenEvidenceFamilies) reasons.add("METRIC_UNRESOLVED");
  if (input.unresolvedCriticalContradictions > 0) reasons.add("CRITICAL_SOURCE_CONFLICT");
  if (!complete) return { color: "INCOMPLETE", reasonCodes: [...reasons] };
  if (input.auditVeto === "RED_VETO" || input.auditVeto === "PASS_VETO") return { color: "RED_PASS", reasonCodes: [] };
  const doubleGreen = input.effectiveIndependentEvidenceCount >= 6 && input.strongestFamilyRemovalStable && input.matrixRemovalStable;
  return { color: doubleGreen ? "DOUBLE_GREEN" : "GREEN", reasonCodes: [] };
}

export function effectiveIndependentEvidenceCount(families: readonly { familyId: string; independent: boolean; matrixDerived: boolean }[]): number {
  return new Set(families.filter((family) => family.independent && !family.matrixDerived).map((family) => family.familyId)).size;
}
