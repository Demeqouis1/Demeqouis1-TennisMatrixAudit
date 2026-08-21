import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const prohibited = [
  "proprietary internal", "private 100-match", "private physiological", "instrumented player", "sleep", "hydration", "soreness", "medication", "muscle fatigue", "cardiovascular fatigue", "training load",
  "archetype-neighborhood", "nearest-opponent", "favorite failure twins", "underdog success twins", "twin outcome rate", "twin reliability gate", "break-after-break", "interruption sensitivity", "error pressure", "error spike", "error-induction", "match-state resilience", "shock response", "lead protection", "upset conversion", "shot-tracking", "rally data", "score-state", "deep tiebreak", "biometric", "physical-cliff", "player-specific wind", "wind split", "humidity split", "ball-degradation", "court-speed-response", "recovery efficiency", "workload debt", "circadian mismatch", "travel-recovery",
];

async function textFiles(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => readFile(join(path, entry.name), "utf8")));
}

test("active audit artifacts contain no removed metric definitions", async () => {
  const content = (await Promise.all([textFiles("Audit"), readFile("Disagreement audit", "utf8"), readFile("audit-engine/domain.ts", "utf8"), readFile("audit-engine/compliance.ts", "utf8"), readFile("AUDIT_COMPLIANCE_MAP.md", "utf8")])).flat().join("\n").toLowerCase();
  for (const term of prohibited) assert.equal(content.includes(term), false, `removed scope reappeared: ${term}`);
});
