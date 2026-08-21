import { PDFParse } from "pdf-parse";

export const MATCHUP_CONFIDENCE_THRESHOLD = 0.9;

export type ExtractionStatus = "CONFIRMED" | "AMBIGUOUS" | "INSUFFICIENT" | "FAILED";

export interface UploadedPdfPage {
  page: number;
  text: string;
}

export interface UploadedPdf {
  fileId: string;
  fileName: string;
  pages: readonly UploadedPdfPage[];
}

export interface MatchupCandidate {
  player1RawText: string;
  player2RawText: string;
  player1: string;
  player2: string;
  sourcePage: number;
  sourceText: string;
  sourceLocation: string;
  relationshipConfirmed: boolean;
  confidence: number;
}

export interface MatchupProvenance {
  source_type: "uploaded_pdf";
  uploaded_file_name: string;
  uploaded_file_id: string;
  player1: string;
  player2: string;
  player1_raw_text: string;
  player2_raw_text: string;
  normalized_player1: string;
  normalized_player2: string;
  source_page: number;
  source_text: string;
  source_location: string;
  relationship_confirmed: boolean;
  extraction_confidence: number;
  extraction_status: ExtractionStatus;
  ambiguous_candidates: readonly string[];
}

export class MatchupExtractionError extends Error {
  readonly status: Exclude<ExtractionStatus, "CONFIRMED">;
  readonly provenance: MatchupProvenance;

  constructor(message: string, status: Exclude<ExtractionStatus, "CONFIRMED">, provenance: MatchupProvenance) {
    super(message);
    this.name = "MatchupExtractionError";
    this.status = status;
    this.provenance = provenance;
  }
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u00a0\u2000-\u200b]/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}' .-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rawName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function candidateKey(player1: string, player2: string): string {
  return `${normalizeName(player1).toLowerCase()}|${normalizeName(player2).toLowerCase()}`;
}

function isName(value: string): boolean {
  const words = normalizeName(value).split(" ").filter(Boolean);
  return words.length >= 2 && words.length <= 5 && words.every((word) => /\p{L}/u.test(word));
}

function makeCandidate(page: UploadedPdfPage, player1Value: string, player2Value: string, sourceText: string, location: string, repeated: boolean): MatchupCandidate | undefined {
  const player1 = normalizeName(player1Value);
  const player2 = normalizeName(player2Value);
  if (!isName(player1) || !isName(player2) || player1.toLowerCase() === player2.toLowerCase()) return undefined;
  const explicitRelationship = /\b(?:vs?\.?|versus)\b|player\s*[12]/i.test(sourceText);
  const score = Math.min(1, 0.7 + (explicitRelationship ? 0.2 : 0) + (location === "heading" ? 0.1 : 0) + (repeated ? 0.1 : 0));
  return {
    player1RawText: rawName(player1Value),
    player2RawText: rawName(player2Value),
    player1,
    player2,
    sourcePage: page.page,
    sourceText: rawName(sourceText),
    sourceLocation: `page ${page.page}, ${location}`,
    relationshipConfirmed: explicitRelationship,
    confidence: score,
  };
}

function extractCandidates(pdf: UploadedPdf): MatchupCandidate[] {
  const found: MatchupCandidate[] = [];
  for (const page of pdf.pages) {
    const lines = page.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const versus = line.match(/^(.+?)\s+(?:vs?\.?|versus)\s+(.+?)(?:\s*[|,;].*)?$/i);
      const playerLabels = line.match(/^player\s*1\s*:\s*(.+?)\s*(?:\||;|$)/i);
      const nextPlayerLabel = lines[index + 1]?.match(/^player\s*2\s*:\s*(.+?)\s*(?:\||;|$)/i);
      let candidate: MatchupCandidate | undefined;
      if (versus) {
        const surrounding = lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2)).join(" | ");
        const repeated = pdf.pages.some((other) => other.page !== page.page && candidateKey(versus[1] ?? "", versus[2] ?? "") && candidateKey(versus[1] ?? "", versus[2] ?? "") === candidateKeyFromText(other.text, versus[1] ?? "", versus[2] ?? ""));
        candidate = makeCandidate(page, versus[1] ?? "", versus[2] ?? "", surrounding, index === 0 ? "heading" : "matchup block", repeated);
      } else if (playerLabels && nextPlayerLabel) {
        const sourceText = `${line} | ${nextPlayerLabel[0]}`;
        candidate = makeCandidate(page, playerLabels[1] ?? "", nextPlayerLabel[1] ?? "", sourceText, "structured matchup block", false);
      }
      if (candidate) found.push(candidate);
    }
  }
  return deduplicate(found);
}

function candidateKeyFromText(text: string, player1: string, player2: string): string {
  const normalized = normalizeName(text).toLowerCase();
  return normalized.includes(normalizeName(player1).toLowerCase()) && normalized.includes(normalizeName(player2).toLowerCase()) ? candidateKey(player1, player2) : "";
}

function deduplicate(candidates: readonly MatchupCandidate[]): MatchupCandidate[] {
  const byKey = new Map<string, MatchupCandidate>();
  for (const candidate of candidates) {
    const key = candidateKey(candidate.player1, candidate.player2);
    const previous = byKey.get(key);
    if (!previous || candidate.confidence > previous.confidence) byKey.set(key, candidate);
  }
  return [...byKey.values()];
}

function provenance(pdf: UploadedPdf, status: ExtractionStatus, candidate?: MatchupCandidate, ambiguousCandidates: readonly string[] = []): MatchupProvenance {
  return {
    source_type: "uploaded_pdf",
    uploaded_file_name: pdf.fileName,
    uploaded_file_id: pdf.fileId,
    player1: candidate?.player1 ?? "",
    player2: candidate?.player2 ?? "",
    player1_raw_text: candidate?.player1RawText ?? "",
    player2_raw_text: candidate?.player2RawText ?? "",
    normalized_player1: candidate?.player1 ?? "",
    normalized_player2: candidate?.player2 ?? "",
    source_page: candidate?.sourcePage ?? 0,
    source_text: candidate?.sourceText ?? "",
    source_location: candidate?.sourceLocation ?? "",
    relationship_confirmed: candidate?.relationshipConfirmed ?? false,
    extraction_confidence: candidate?.confidence ?? 0,
    extraction_status: status,
    ambiguous_candidates: ambiguousCandidates,
  };
}

function independentlyVerifyCandidate(pdf: UploadedPdf, candidate: MatchupCandidate): boolean {
  const page = pdf.pages.find((item) => item.page === candidate.sourcePage);
  if (!page) return false;
  const player1 = candidate.player1.toLowerCase();
  const player2 = candidate.player2.toLowerCase();
  const lines = page.text.split(/\r?\n/);
  const versusConfirmed = lines.some((line) => {
    const normalizedLine = normalizeName(line).toLowerCase();
    return normalizedLine.includes(player1) && normalizedLine.includes(player2) && /\b(?:vs?\.?|versus)\b/i.test(line);
  });
  const player1Index = lines.findIndex((line) => /^player\s*1\s*:/i.test(line.trim()) && normalizeName(line).toLowerCase().includes(player1));
  const player2Line = player1Index >= 0 ? lines[player1Index + 1] ?? "" : "";
  return versusConfirmed || (/^player\s*2\s*:/i.test(player2Line.trim()) && normalizeName(player2Line).toLowerCase().includes(player2));
}

function verifyCandidate(pdf: UploadedPdf, candidate: MatchupCandidate, allCandidates: readonly MatchupCandidate[], threshold: number): MatchupCandidate {
  const independentlyConfirmed = independentlyVerifyCandidate(pdf, candidate);
  if (!independentlyConfirmed || !candidate.relationshipConfirmed || candidate.confidence + Number.EPSILON < threshold || allCandidates.length !== 1) {
    const status: Exclude<ExtractionStatus, "CONFIRMED"> = allCandidates.length > 1 ? "AMBIGUOUS" : "INSUFFICIENT";
    throw new MatchupExtractionError("Uploaded PDF does not contain a confidently identified Player 1 vs Player 2 matchup.", status, provenance(pdf, status, candidate, allCandidates.length > 1 ? allCandidates.map((item) => `${item.player1} vs ${item.player2}`) : []));
  }
  return candidate;
}

export function extractUploadedPdfMatchup(pdf: UploadedPdf, threshold = MATCHUP_CONFIDENCE_THRESHOLD): MatchupProvenance {
  if (!pdf.fileId || !pdf.fileName || pdf.pages.length === 0 || pdf.pages.every((page) => !page.text.trim())) {
    const failedStatus: Exclude<ExtractionStatus, "CONFIRMED"> = pdf.pages.length === 0 ? "FAILED" : "INSUFFICIENT";
    throw new MatchupExtractionError("Uploaded PDF could not be read for matchup extraction.", failedStatus, provenance(pdf, failedStatus));
  }
  const firstPass = extractCandidates(pdf);
  if (firstPass.length === 0) throw new MatchupExtractionError("Uploaded PDF does not contain a recognizable matchup relationship.", "INSUFFICIENT", provenance(pdf, "INSUFFICIENT"));
  const verified = verifyCandidate(pdf, firstPass[0] as MatchupCandidate, firstPass, threshold);
  return provenance(pdf, "CONFIRMED", verified);
}

export async function extractUploadedPdfBytesMatchup(file: { fileId: string; fileName: string; data: Uint8Array }, threshold = MATCHUP_CONFIDENCE_THRESHOLD): Promise<MatchupProvenance> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: file.data });
    const textResult = await parser.getText();
    return extractUploadedPdfMatchup({
      fileId: file.fileId,
      fileName: file.fileName,
      pages: textResult.pages.map((page) => ({ page: page.num, text: page.text })),
    }, threshold);
  } catch (error) {
    if (error instanceof MatchupExtractionError) throw error;
    const failedPdf: UploadedPdf = { fileId: file.fileId, fileName: file.fileName, pages: [] };
    throw new MatchupExtractionError("Uploaded PDF could not be parsed for matchup extraction.", "FAILED", provenance(failedPdf, "FAILED"));
  } finally {
    await parser?.destroy();
  }
}
