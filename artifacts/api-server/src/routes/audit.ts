import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { PDFParse } from "pdf-parse";
import {
  ExecuteAuditMatchParams,
  GetAuditMatchParams,
  ListAuditMatchesQueryParams,
} from "@workspace/api-zod";
import { createUploadedPdfAuditRun, executeUploadedPdfAudit } from "../../../../audit-engine/pdf-run.js";

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

type Match = {
  id: string;
  player1: string;
  player2: string;
  tournament: string;
  round: string;
  surface: string;
  scheduled: string;
  status: string;
  auditColor: string;
  progress: number;
  independentWinner: string;
  matrixWinner: string;
  matrixWp: number;
  verifiedWinRate: number;
  evidenceFamilies: Array<{
    name: string;
    category: string;
    player1: string;
    player2: string;
    coverage: number;
    reliability: string;
  }>;
  executionStages: Array<{ name: string; status: string; detail: string }>;
  matrixFirewall: {
    status: string;
    independentCommittedAt: string;
    matrixRevealedAt: string;
  };
  resultTracking: {
    matrixPrediction: string;
    independentAudit: string;
    finalSelection: string;
  };
  blockers: string[];
};

const now = "2026-08-20T03:00:00.000Z";

const stages = (completeThrough: number) => [
  ["Summary ingestion", "COMPLETE", "PDF parsed; 3 pages accounted for."],
  ["Identity verification", "COMPLETE", "Both players and event identity verified."],
  ["Research lock", "COMPLETE", "Pre-match evidence snapshot frozen before first serve."],
  ["P1 / P2 metrics", completeThrough >= 4 ? "COMPLETE" : "RUNNING", "Symmetric treatment required for every applicable metric."],
  ["Independent conclusion", completeThrough >= 5 ? "COMPLETE" : "NOT_STARTED", "Independent winner committed before Matrix reveal."],
  ["Verification audit", completeThrough >= 6 ? "COMPLETE" : "NOT_STARTED", "All active verification rules must execute."],
  ["Disagreement / trap audit", completeThrough >= 7 ? "COMPLETE" : "NOT_STARTED", "Contradictions and trap signals evaluated."],
  ["Dangerous underdog", completeThrough >= 8 ? "COMPLETE" : "NOT_STARTED", "Both players have a supported win pathway."],
  ["Stress tests", completeThrough >= 9 ? "COMPLETE" : "NOT_STARTED", "Matrix removal and family-removal tests."],
  ["Final combination gate", completeThrough >= 10 ? "COMPLETE" : "BLOCKED", completeThrough >= 10 ? "Gate passed with stable evidence." : "Awaiting required execution records."],
].map(([name, status, detail]) => ({ name, status, detail }));

const makeMatch = (
  id: string,
  player1: string,
  player2: string,
  tournament: string,
  round: string,
  surface: string,
  color: string,
  progress: number,
  independentWinner: string,
  matrixWinner: string,
  matrixWp: number,
  verifiedWinRate: number,
  completeThrough: number,
  blockers: string[] = [],
): Match => ({
  id,
  player1,
  player2,
  tournament,
  round,
  surface,
  scheduled: "Today · 14:30 local",
  status: progress === 100 ? "READY FOR FINAL GATE" : blockers.length ? "PARTIALLY BLOCKED" : "RUNNING",
  auditColor: color,
  progress,
  independentWinner,
  matrixWinner,
  matrixWp,
  verifiedWinRate,
  evidenceFamilies: [
    { name: "Present strength", category: "Ratings", player1: "Elo 1,847", player2: "Elo 1,791", coverage: 100, reliability: "HIGH" },
    { name: "Surface form", category: "Context", player1: "18–7 this season", player2: "11–10 this season", coverage: 92, reliability: "HIGH" },
    { name: "Serve / return", category: "Performance", player1: "Hold 82% · BP 39%", player2: "Hold 77% · BP 34%", coverage: 88, reliability: "MEDIUM" },
    { name: "Availability", category: "News", player1: "No active flag", player2: "No active flag", coverage: 76, reliability: "MEDIUM" },
  ],
  executionStages: stages(completeThrough),
  matrixFirewall: {
    status: completeThrough >= 5 ? "VALID" : "PENDING",
    independentCommittedAt: completeThrough >= 5 ? now : "",
    matrixRevealedAt: completeThrough >= 5 ? "2026-08-20T03:00:04.000Z" : "",
  },
  resultTracking: {
    matrixPrediction: matrixWinner,
    independentAudit: independentWinner,
    finalSelection: color === "INCOMPLETE" ? "UNSET" : independentWinner,
  },
  blockers,
});

const matches: Match[] = [
  makeMatch("m-001", "Iga Swiatek", "Jasmine Paolini", "Cincinnati Open", "Quarterfinal", "Hard", "DOUBLE_GREEN", 100, "Iga Swiatek", "Iga Swiatek", 0.78, 0.789, 10),
  makeMatch("m-002", "Aryna Sabalenka", "Elena Rybakina", "Cincinnati Open", "Quarterfinal", "Hard", "GREEN", 82, "Aryna Sabalenka", "Aryna Sabalenka", 0.71, 0.741, 7),
  makeMatch("m-003", "Jannik Sinner", "Alexander Zverev", "Cincinnati Open", "Semifinal", "Hard", "YELLOW", 58, "Jannik Sinner", "Alexander Zverev", 0.63, 0.731, 5, ["CRITICAL_SOURCE_STALE"]),
  makeMatch("m-004", "Coco Gauff", "Madison Keys", "Cincinnati Open", "Quarterfinal", "Hard", "INCOMPLETE", 31, "UNCOMMITTED", "Coco Gauff", 0.69, 0.565, 3, ["PLAYER_ID_UNRESOLVED", "VERIFICATION_RULE_UNMAPPED"]),
];

const router: IRouter = Router();

router.get("/audit/summary", (_req, res) => {
  const complete = matches.filter((match) => match.progress === 100).length;
  const blocked = matches.filter((match) => match.blockers.length > 0).length;
  const ready = matches.filter((match) => match.progress >= 80).length;
  const green = matches.filter((match) => ["GREEN", "DOUBLE_GREEN"].includes(match.auditColor)).length;
  res.json({
    slateName: "Cincinnati Open · verification slate",
    matches: matches.length,
    ready,
    blocked,
    complete,
    greenRate: green / matches.length,
    lastUpdated: now,
  });
});

router.get("/audit/matches", (req, res) => {
  const parsed = ListAuditMatchesQueryParams.safeParse(req.query);
  const search = parsed.success ? (parsed.data.search ?? "").toLowerCase() : "";
  const status = parsed.success ? parsed.data.status : undefined;
  res.json(
    matches
      .filter((match) => !status || match.status === status || match.auditColor === status)
      .filter((match) => !search || `${match.player1} ${match.player2} ${match.tournament}`.toLowerCase().includes(search)),
  );
});

router.get("/audit/matches/:matchId", (req, res) => {
  const parsed = GetAuditMatchParams.safeParse(req.params);
  const match = parsed.success ? matches.find((item) => item.id === parsed.data.matchId) : undefined;
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }
  res.json(match);
});

router.post("/audit/matches/:matchId/execute", (req, res) => {
  const parsed = ExecuteAuditMatchParams.safeParse(req.params);
  const match = parsed.success ? matches.find((item) => item.id === parsed.data.matchId) : undefined;
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }
  match.progress = 100;
  match.status = "READY FOR FINAL GATE";
  match.auditColor = match.id === "m-004" ? "YELLOW" : match.auditColor;
  match.blockers = match.id === "m-004" ? ["PLAYER_ID_UNRESOLVED"] : [];
  match.executionStages = stages(10);
  match.matrixFirewall = {
    status: "VALID",
    independentCommittedAt: now,
    matrixRevealedAt: "2026-08-20T03:00:04.000Z",
  };
  res.json(match);
});

router.post("/audit/run-ready", pdfUpload.single("pdf"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "UPLOADED_PDF_REQUIRED", message: "Attach one PDF in the pdf form field." });
    return;
  }

  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: req.file.buffer });
    const text = await parser.getText();
    const run = createUploadedPdfAuditRun({
      fileId: `${req.file.originalname}:${req.file.size}:${randomUUID()}`,
      fileName: req.file.originalname,
      pages: text.pages.map((page) => ({ page: page.num, text: page.text })),
    }, randomUUID());
    const execution = executeUploadedPdfAudit(run, {
      verification: (input) => ({ player1: input.player1, player2: input.player2, status: "READY" }),
      disagreement: (input) => ({ player1: input.player1, player2: input.player2, status: "READY" }),
      metrics: (input) => ({ player1: input.player1, player2: input.player2, status: "READY" }),
    });
    res.json({
      status: "READY_FOR_AUDIT",
      executed: 1,
      sourceType: run.source_type,
      extractionStatus: run.extraction_status,
      extractionConfidence: run.extraction_confidence,
      provenance: run.provenance,
      results: [{
        matchId: run.id,
        matchup: `${run.player1} vs ${run.player2}`,
        auditColor: "INCOMPLETE",
        verification: { player1: { status: "READY", conclusion: `${execution.verification.player1} identity confirmed from uploaded PDF` }, player2: { status: "READY", conclusion: `${execution.verification.player2} identity confirmed from uploaded PDF` } },
        disagreement: { status: "READY", matrixPick: "UNCOMMITTED", independentPick: "UNCOMMITTED" },
        metrics: { player1: { source: execution.metrics.player1 }, player2: { source: execution.metrics.player2 } },
      }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Uploaded PDF could not be validated.";
    const details = error && typeof error === "object" && "provenance" in error ? { provenance: error.provenance } : {};
    res.status(422).json({ error: "MATCHUP_VALIDATION_FAILED", message, ...details });
  } finally {
    await parser?.destroy();
  }
});

router.get("/audit/board", (_req, res) => {
  const order = ["DOUBLE_GREEN", "GREEN", "YELLOW", "RED_PASS", "INCOMPLETE"];
  const board = [...matches]
    .sort((a, b) => order.indexOf(a.auditColor) - order.indexOf(b.auditColor) || b.verifiedWinRate - a.verifiedWinRate)
    .map((match, index) => ({
      ...match,
      rank: index + 1,
      confidenceBand: match.auditColor === "DOUBLE_GREEN" ? "85–89% · proven" : match.auditColor === "GREEN" ? "70–79% · supported" : "review required",
    }));
  res.json(board);
});

export default router;