import test from "node:test";
import assert from "node:assert/strict";
import { assertUploadedPdfAuditInput, createUploadedPdfAuditRun, executeUploadedPdfAudit, MatchupIdentityMismatchError } from "../audit-engine/pdf-run.js";
import { extractUploadedPdfBytesMatchup, MatchupExtractionError, type UploadedPdf } from "../audit-engine/pdf-matchup.js";

const pdf = (fileId: string, text: string): UploadedPdf => ({ fileId, fileName: `${fileId}.pdf`, pages: [{ page: 1, text }] });

test("clear uploaded matchup is passed unchanged to all audit systems", () => {
  const run = createUploadedPdfAuditRun(pdf("a", "Arthur Fils vs Thiago Tirante\nH2H: Alex de Minaur"), "run-a");
  const received: string[] = [];
  executeUploadedPdfAudit(run, {
    verification: (input) => { received.push(`v:${input.player1}/${input.player2}`); return input; },
    disagreement: (input) => { received.push(`d:${input.player1}/${input.player2}`); return input; },
    metrics: (input) => { received.push(`m:${input.player1}/${input.player2}`); return input; },
  });
  assert.equal(run.provenance.source_type, "uploaded_pdf");
  assert.deepEqual({
    uploaded_file_id: run.provenance.uploaded_file_id,
    player1_raw_text: run.provenance.player1_raw_text,
    player2_raw_text: run.provenance.player2_raw_text,
    normalized_player1: run.provenance.normalized_player1,
    normalized_player2: run.provenance.normalized_player2,
    extraction_status: run.provenance.extraction_status,
    relationship_confirmed: run.provenance.relationship_confirmed,
  }, {
    uploaded_file_id: "a",
    player1_raw_text: "Arthur Fils",
    player2_raw_text: "Thiago Tirante",
    normalized_player1: "Arthur Fils",
    normalized_player2: "Thiago Tirante",
    extraction_status: "CONFIRMED",
    relationship_confirmed: true,
  });
  assert.deepEqual(received, ["v:Arthur Fils/Thiago Tirante", "d:Arthur Fils/Thiago Tirante", "m:Arthur Fils/Thiago Tirante"]);
});

test("one identifiable player is insufficient and cannot execute", () => {
  assert.throws(() => createUploadedPdfAuditRun(pdf("b", "Arthur Fils\nRecent opponent: Novak Djokovic"), "run-b"), (error: unknown) => error instanceof MatchupExtractionError && error.status === "INSUFFICIENT");
});

test("unreadable PDF fails without a fallback", () => {
  assert.throws(() => createUploadedPdfAuditRun({ fileId: "c", fileName: "unreadable.pdf", pages: [] }, "run-c"), (error: unknown) => error instanceof MatchupExtractionError && error.status === "FAILED");
});

test("malformed uploaded PDF bytes fail without a fallback", async () => {
  await assert.rejects(() => extractUploadedPdfBytesMatchup({ fileId: "bytes", fileName: "malformed.pdf", data: new Uint8Array([1, 2, 3]) }), (error: unknown) => error instanceof MatchupExtractionError && error.status === "FAILED");
});

test("unrelated names do not replace the explicit matchup", () => {
  const run = createUploadedPdfAuditRun(pdf("d", "Arthur Fils vs Thiago Tirante\nRecent matches: Alex de Minaur, Novak Djokovic, Jiri Lehecka"), "run-d");
  assert.deepEqual([run.player1, run.player2], ["Arthur Fils", "Thiago Tirante"]);
});

test("multiple explicit candidates are ambiguous", () => {
  assert.throws(() => createUploadedPdfAuditRun(pdf("e", "Arthur Fils vs Thiago Tirante\nJacob Fearnley vs Alexis Galarneau"), "run-e"), (error: unknown) => error instanceof MatchupExtractionError && error.status === "AMBIGUOUS");
});

test("separate uploads cannot cross-contaminate identities", () => {
  const runA = createUploadedPdfAuditRun(pdf("a", "Arthur Fils vs Thiago Tirante"), "run-a");
  const runB = createUploadedPdfAuditRun(pdf("b", "Jacob Fearnley vs Alexis Galarneau"), "run-b");
  assert.deepEqual([runA.player1, runA.player2], ["Arthur Fils", "Thiago Tirante"]);
  assert.deepEqual([runB.player1, runB.player2], ["Jacob Fearnley", "Alexis Galarneau"]);
  assert.notEqual(runA.provenance.uploaded_file_id, runB.provenance.uploaded_file_id);
});

test("stage identity mismatch is rejected before execution", () => {
  const run = createUploadedPdfAuditRun(pdf("g", "Arthur Fils vs Thiago Tirante"), "run-g");
  assert.throws(() => assertUploadedPdfAuditInput(run, { runId: run.id, player1: "Demo Player", player2: run.player2 }), (error: unknown) => error instanceof MatchupIdentityMismatchError);
  assert.throws(() => assertUploadedPdfAuditInput(run, { runId: run.id, player1: run.player1, player2: "Other Player" }), (error: unknown) => error instanceof MatchupIdentityMismatchError);
});
