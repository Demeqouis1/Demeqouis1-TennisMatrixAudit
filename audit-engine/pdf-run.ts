import { MatchupExtractionError, extractUploadedPdfMatchup, type MatchupProvenance, type UploadedPdf } from "./pdf-matchup.js";

export interface UploadedPdfAuditRun {
  id: string;
  source_type: "uploaded_pdf";
  extraction_status: MatchupProvenance["extraction_status"];
  extraction_confidence: number;
  relationship_confirmed: boolean;
  player1: string;
  player2: string;
  provenance: MatchupProvenance;
}

export interface AuditStageInput {
  runId: string;
  player1: string;
  player2: string;
}

export interface PdfAuditStageHandlers<T> {
  verification: (input: AuditStageInput) => T;
  disagreement: (input: AuditStageInput) => T;
  metrics: (input: AuditStageInput) => T;
}

export interface PdfAuditExecution<T> {
  run: UploadedPdfAuditRun;
  verification: T;
  disagreement: T;
  metrics: T;
}

export class MatchupIdentityMismatchError extends Error {
  constructor() {
    super("MATCHUP_IDENTITY_MISMATCH");
    this.name = "MatchupIdentityMismatchError";
  }
}

function requireConfirmedRun(run: UploadedPdfAuditRun, threshold: number): void {
  if (run.source_type !== "uploaded_pdf" || run.extraction_status !== "CONFIRMED" || !run.player1 || !run.player2 || !run.relationship_confirmed || run.extraction_confidence < threshold) {
    throw new MatchupExtractionError("Uploaded PDF does not contain a confidently identified Player 1 vs Player 2 matchup.", run.extraction_status === "CONFIRMED" ? "FAILED" : run.extraction_status, run.provenance);
  }
}

export function assertUploadedPdfAuditInput(run: UploadedPdfAuditRun, input: AuditStageInput): void {
  if (input.runId !== run.id || input.player1 !== run.player1 || input.player2 !== run.player2) throw new MatchupIdentityMismatchError();
}

export function createUploadedPdfAuditRun(pdf: UploadedPdf, runId: string, threshold?: number): UploadedPdfAuditRun {
  const extracted = extractUploadedPdfMatchup(pdf, threshold);
  return {
    id: runId,
    source_type: "uploaded_pdf",
    extraction_status: extracted.extraction_status,
    extraction_confidence: extracted.extraction_confidence,
    relationship_confirmed: extracted.relationship_confirmed,
    player1: extracted.player1,
    player2: extracted.player2,
    provenance: extracted,
  };
}

export function executeUploadedPdfAudit<T>(run: UploadedPdfAuditRun, handlers: PdfAuditStageHandlers<T>, threshold = 0.9): PdfAuditExecution<T> {
  requireConfirmedRun(run, threshold);
  const input = { runId: run.id, player1: run.player1, player2: run.player2 };
  assertUploadedPdfAuditInput(run, input);
  return {
    run,
    verification: handlers.verification(input),
    disagreement: handlers.disagreement(input),
    metrics: handlers.metrics(input),
  };
}
