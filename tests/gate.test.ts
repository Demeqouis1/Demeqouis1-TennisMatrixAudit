import test from "node:test";
import assert from "node:assert/strict";
import { effectiveIndependentEvidenceCount, evaluateFinalColor } from "../audit-engine/gate.js";
import type { GreenGateInput } from "../audit-engine/gate.js";

const input = (): GreenGateInput => ({
  matchId: "m1", mandatoryMetricIds: [], requirementExecutions: Array.from({ length: 50 }, (_, index) => ({ requirementId: index + 1, disposition: "COMPLETE" as const, attemptedAt: "2026-08-19T10:00:00Z" })), p1Handling: [], p2Handling: [],
  verificationExecuted: 1, verificationTotal: 1, disagreementExecuted: 1, disagreementTotal: 1,
  underdogExecuted: 1, underdogTotal: 1, stressExecuted: 1, stressTotal: 1,
  criticalSourcesExecuted: 1, criticalSourcesTotal: 1, evidenceFamiliesExecuted: 6, evidenceFamiliesTotal: 6,
  reconstructionsExecuted: 0, reconstructionsTotal: 0, calibrationStatus: "COMPLETE",
  identityVerified: true, criticalDependenciesResolved: true, matrixFirewallValid: true, reasonCodes: [],
  effectiveIndependentEvidenceCount: 6, requiredGreenEvidenceFamilies: 4,
  matrixRemovalStable: true, strongestFamilyRemovalStable: true, dangerousUnderdogClear: true,
  unresolvedCriticalContradictions: 0,
});

test("Matrix-derived signals do not increase effective evidence", () => {
  assert.equal(effectiveIndependentEvidenceCount([
    { familyId: "matrix-wp", independent: false, matrixDerived: true },
    { familyId: "matrix-elo", independent: false, matrixDerived: true },
    { familyId: "serve", independent: true, matrixDerived: false },
    { familyId: "serve", independent: true, matrixDerived: false },
  ]), 1);
});

test("Matrix removal failure locks Green", () => {
  const result = evaluateFinalColor({ ...input(), matrixRemovalStable: false });
  assert.equal(result.color, "INCOMPLETE");
  assert.ok(result.reasonCodes.includes("GREEN_LOCKED"));
});

test("complete independent evidence can produce Double Green", () => {
  assert.equal(evaluateFinalColor(input()).color, "DOUBLE_GREEN");
});

test("incomplete Parts 1-50 ledger cannot produce Green", () => {
  assert.equal(evaluateFinalColor({ ...input(), requirementExecutions: [] }).color, "INCOMPLETE");
});
