import test from "node:test";
import assert from "node:assert/strict";
import { calculateRequirementCompletion, createRequirementLedger, evidenceFamilyCount, recomputeCalibration, trapGameScore } from "../audit-engine/compliance.js";

test("Parts 1-50 require an execution disposition for every rule", () => {
  const ledger = createRequirementLedger("2026-08-19T10:00:00Z");
  assert.equal(ledger.length, 50);
  assert.deepEqual(calculateRequirementCompletion(ledger), { complete: false, completed: 0, total: 50 });
  const firstRequirement = ledger[0];
  assert.ok(firstRequirement);
  ledger[0] = { ...firstRequirement, disposition: "COMPLETE" };
  assert.equal(calculateRequirementCompletion(ledger).complete, false);
});

test("trap score counts only the ten defined underdog checks", () => {
  assert.equal(trapGameScore({
    componentSupport: true, multipleComponentSupport: true, marketSupport: false,
    monteCarloBelow55: true, monteCarloBelow50: false, fresherUnderdog: true,
    improvingUnderdog: false, moderateOrCloser: true, highConfidenceLabel: false,
    surfaceStyleFit: true, ceilingEvent: true, ratingLag: "CLEARLY_LAGGING", decision: "DOWNGRADE",
  }), 6);
});

test("calibration buckets are recomputed from the supplied observations", () => {
  const observations = Array.from({ length: 10 }, (_, index) => ({
    matchId: `m${index}`, result: index < 8 ? "WIN" as const : "LOSS" as const,
    closeness: index < 4 ? "Close" : "Moderate lean", headlineProbability: 0.62,
    monteCarloProbability: 0.54, eloGap: 40, recentFormGap: 12,
  }));
  const calibration = recomputeCalibration(observations);
  assert.equal(calibration.overall?.winRate, 0.8);
  assert.equal(calibration.overall?.tooSmall, false);
  assert.equal(calibration.monteCarloBelow55?.total, 10);
  assert.equal(calibration.eloGapAtLeast50?.total, 0);
});

test("matrix-derived or correlated entries do not create independent families", () => {
  assert.equal(evidenceFamilyCount([
    { family: "Surface Elo", player1: "p1", player2: "p2", reliability: "HIGH", sample: "50", strength: "STRONG", contradiction: false, weight: "FULL", independent: false, matrixDerived: true },
    { family: "Serve", player1: "p1", player2: "p2", reliability: "HIGH", sample: "50", strength: "STRONG", contradiction: false, weight: "FULL", independent: true, matrixDerived: false },
    { family: "Serve", player1: "p1", player2: "p2", reliability: "MEDIUM", sample: "20", strength: "WEAK", contradiction: true, weight: "REDUCED", independent: true, matrixDerived: false },
  ]), 1);
});