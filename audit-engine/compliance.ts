import type {
  CalibrationObservation,
  DisagreementSignal,
  EvidenceLedgerEntry,
  RequirementDisposition,
  RequirementExecution,
} from "./domain.js";

const ACCEPTED_DISPOSITIONS: readonly RequirementDisposition[] = ["COMPLETE", "PARTIAL", "UNAVAILABLE", "EXCLUDED"];

export function createRequirementLedger(attemptedAt: string): RequirementExecution[] {
  return Array.from({ length: 50 }, (_, index) => ({
    requirementId: index + 1,
    disposition: "NOT_STARTED",
    attemptedAt,
    note: "No execution record supplied.",
  }));
}

export function calculateRequirementCompletion(requirements: readonly RequirementExecution[]): { complete: boolean; completed: number; total: number } {
  const unique = new Set<number>();
  let completed = 0;
  for (const requirement of requirements) {
    if (requirement.requirementId >= 1 && requirement.requirementId <= 50 && !unique.has(requirement.requirementId)) {
      unique.add(requirement.requirementId);
      if (ACCEPTED_DISPOSITIONS.includes(requirement.disposition)) completed += 1;
    }
  }
  return { complete: unique.size === 50 && completed === 50, completed, total: 50 };
}

export function countMaterialIndependentDisagreements(signals: readonly DisagreementSignal[]): number {
  return signals.filter((signal) => signal.material && signal.relationship === "INDEPENDENT" && signal.reliability === "HIGH").length;
}

export function evidenceFamilyCount(entries: readonly EvidenceLedgerEntry[]): number {
  return new Set(entries.filter((entry) => entry.independent && !entry.matrixDerived).map((entry) => entry.family)).size;
}

export interface CalibrationBucket {
  total: number;
  wins: number;
  winRate: number | null;
  tooSmall: boolean;
}

function bucket(observations: readonly CalibrationObservation[], predicate: (observation: CalibrationObservation) => boolean): CalibrationBucket {
  const selected = observations.filter(predicate);
  const wins = selected.filter((observation) => observation.result === "WIN").length;
  return { total: selected.length, wins, winRate: selected.length === 0 ? null : wins / selected.length, tooSmall: selected.length < 10 };
}

export function recomputeCalibration(observations: readonly CalibrationObservation[]): Record<string, CalibrationBucket> {
  return {
    overall: bucket(observations, () => true),
    close: bucket(observations, (observation) => observation.closeness.toLowerCase().includes("close")),
    headlineBelow65: bucket(observations, (observation) => observation.headlineProbability < 0.65),
    monteCarloBelow55: bucket(observations, (observation) => observation.monteCarloProbability < 0.55),
    eloGapAtLeast50: bucket(observations, (observation) => Math.abs(observation.eloGap) >= 50),
    recentFormAdvantageOver10: bucket(observations, (observation) => Math.abs(observation.recentFormGap) > 10),
  };
}