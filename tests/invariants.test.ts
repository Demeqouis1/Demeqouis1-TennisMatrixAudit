import test from "node:test";
import assert from "node:assert/strict";
import { calculateCompletion, completeHandling, gradeResult, missingSymmetricMetricIds, verifyMatrixFirewall } from "../audit-engine/invariants.js";
import type { MatchExecutionSnapshot } from "../audit-engine/domain.js";

const baseSnapshot = (): MatchExecutionSnapshot => ({
  matchId: "m1",
  mandatoryMetricIds: ["serve", "return"],
  requirementExecutions: Array.from({ length: 50 }, (_, index) => ({ requirementId: index + 1, disposition: "COMPLETE" as const, attemptedAt: "2026-08-19T10:00:00Z" })),
  p1Handling: [completeHandling("p1", "serve", "DIRECT"), completeHandling("p1", "return", "DIRECT")],
  p2Handling: [completeHandling("p2", "serve", "DIRECT"), completeHandling("p2", "return", "DIRECT")],
  verificationExecuted: 1, verificationTotal: 1,
  disagreementExecuted: 1, disagreementTotal: 1,
  underdogExecuted: 1, underdogTotal: 1,
  stressExecuted: 1, stressTotal: 1,
  criticalSourcesExecuted: 1, criticalSourcesTotal: 1,
  evidenceFamiliesExecuted: 1, evidenceFamiliesTotal: 1,
  reconstructionsExecuted: 0, reconstructionsTotal: 0,
  calibrationStatus: "COMPLETE",
  identityVerified: true,
  criticalDependenciesResolved: true,
  matrixFirewallValid: true,
  reasonCodes: [],
});

test("requires both players for every mandatory metric", () => {
  const snapshot = baseSnapshot();
  snapshot.p2Handling = [completeHandling("p2", "serve", "DIRECT")];
  assert.deepEqual(missingSymmetricMetricIds(snapshot), ["return"]);
  assert.equal(calculateCompletion(snapshot).complete, false);
});

test("Matrix reveal before independent commitment violates firewall", () => {
  assert.deepEqual(verifyMatrixFirewall("2026-08-19T10:00:00Z", "2026-08-19T09:00:00Z"), { valid: false, reasonCodes: ["MATRIX_FIREWALL_VIOLATED"] });
});

test("pre-match withdrawal is yellow non-graded and advances sequence", () => {
  assert.deepEqual(gradeResult({ matchStarted: false, resultType: "PRE_MATCH_WITHDRAWAL" }), { grade: "NON_GRADED", countedInCalibration: false, masterSequenceAdvances: true });
});

test("in-match retirement is graded normally", () => {
  assert.deepEqual(gradeResult({ matchStarted: true, resultType: "IN_MATCH_RETIREMENT", predictedWinner: "p1", actualWinner: "p2" }), { grade: "LOSS", countedInCalibration: true, masterSequenceAdvances: true });
});
