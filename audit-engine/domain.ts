export const EXECUTION_STATUSES = [
  "NOT_STARTED",
  "RUNNING",
  "COMPLETE",
  "BLOCKED",
  "UNAVAILABLE",
  "FAILED",
  "REQUIRES_HUMAN_REVIEW",
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];
export type AuditColor = "DOUBLE_GREEN" | "GREEN" | "YELLOW" | "RED_PASS" | "INCOMPLETE";
export type ResultGrade = "WIN" | "LOSS" | "PASS" | "NON_GRADED";
export type ResultType = "COMPLETED_NORMALLY" | "IN_MATCH_RETIREMENT" | "PRE_MATCH_WITHDRAWAL" | "WALKOVER" | "CANCELLATION" | "DEFAULT" | "ABANDONED" | "SUSPENDED" | "NO_CONTEST" | "UNKNOWN_UNVERIFIED";

export type ReasonCode =
  | "SURFACE_CONFLICT"
  | "PLAYER_ID_UNRESOLVED"
  | "MATCH_IDENTITY_UNRESOLVED"
  | "VERIFICATION_RULE_UNMAPPED"
  | "DISAGREEMENT_RULE_UNMAPPED"
  | "METRIC_UNRESOLVED"
  | "CRITICAL_SOURCE_STALE"
  | "CRITICAL_SOURCE_CONFLICT"
  | "MATRIX_FIREWALL_VIOLATED"
  | "PLAYER_2_DATA_MISSING"
  | "DOCUMENT_PARSE_INCOMPLETE"
  | "RECONSTRUCTION_INPUTS_MISSING"
  | "FIRST_SERVE_TIME_UNRESOLVED"
  | "SOURCE_OUTAGE"
  | "DUPLICATE_MATCH_CONFLICT"
  | "GREEN_LOCKED"
  | "DUPLICATE_CALIBRATION_ENTRY_BLOCKED"
  | "POST_START_DATA_EXCLUDED_FROM_PREMATCH_AUDIT";

export interface PlayerMetricHandling {
  playerId: string;
  metricId: string;
  status: ExecutionStatus;
  handling: "DIRECT" | "RECONSTRUCTED" | "PARTIAL" | "UNAVAILABLE" | "EXCLUDED";
}

export interface MatchExecutionSnapshot {
  matchId: string;
  mandatoryMetricIds: readonly string[];
  requirementExecutions: readonly RequirementExecution[];
  p1Handling: readonly PlayerMetricHandling[];
  p2Handling: readonly PlayerMetricHandling[];
  verificationExecuted: number;
  verificationTotal: number;
  disagreementExecuted: number;
  disagreementTotal: number;
  underdogExecuted: number;
  underdogTotal: number;
  stressExecuted: number;
  stressTotal: number;
  criticalSourcesExecuted: number;
  criticalSourcesTotal: number;
  evidenceFamiliesExecuted: number;
  evidenceFamiliesTotal: number;
  reconstructionsExecuted: number;
  reconstructionsTotal: number;
  calibrationStatus: ExecutionStatus;
  identityVerified: boolean;
  criticalDependenciesResolved: boolean;
  matrixFirewallValid: boolean;
  independentCommittedAt?: string;
  matrixRevealedAt?: string;
  reasonCodes: readonly ReasonCode[];
}

export interface CompletionProof {
  complete: boolean;
  completionPercent: number;
  reasonCodes: readonly ReasonCode[];
}

export interface ResultInput {
  matchStarted: boolean;
  resultType: ResultType;
  predictedWinner?: string;
  actualWinner?: string;
}

export interface GradedResult {
  grade: ResultGrade;
  countedInCalibration: boolean;
  masterSequenceAdvances: boolean;
  reasonCode?: ReasonCode;
}

export type RequirementDisposition = "NOT_STARTED" | "COMPLETE" | "PARTIAL" | "UNAVAILABLE" | "EXCLUDED";
export type EvidenceStrength = "STRONG" | "WEAK" | "CONFLICT";
export type EvidenceReliability = "HIGH" | "MEDIUM" | "LOW";
export type DisagreementRelationship = "INDEPENDENT" | "PARTIALLY_CORRELATED" | "DUPLICATIVE";

export interface RequirementExecution {
  requirementId: number;
  disposition: RequirementDisposition;
  attemptedAt: string;
  note?: string;
}

export interface EvidenceLedgerEntry {
  family: string;
  player1: string;
  player2: string;
  reliability: EvidenceReliability;
  sample: string;
  winner?: string;
  strength: EvidenceStrength;
  contradiction: boolean;
  weight: "FULL" | "REDUCED" | "CONTEXT" | "ZERO";
  independent: boolean;
  matrixDerived: boolean;
}

export interface DisagreementSignal {
  category: string;
  opponent: string;
  relationship: DisagreementRelationship;
  reliability: EvidenceReliability;
  material: boolean;
  note: string;
}

export interface CalibrationObservation {
  matchId: string;
  result: ResultGrade;
  closeness: string;
  headlineProbability: number;
  monteCarloProbability: number;
  eloGap: number;
  recentFormGap: number;
  marketProbability?: number;
}
