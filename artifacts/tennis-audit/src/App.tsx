import { type ReactNode, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Link, Route, Switch, useLocation, useRoute, Router as WouterRouter } from "wouter";
import { AlertTriangle, ArrowUpRight, Check, ChevronRight, CircleDashed, Clock3, FileCheck2, FileText, Filter, Flame, LayoutDashboard, ListChecks, Menu, Play, Search, ShieldCheck, Trophy, UploadCloud, X } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import {
  getGetAuditMatchQueryKey,
  getGetAuditSummaryQueryKey,
  getGetRankedBoardQueryKey,
  getListAuditMatchesQueryKey,
  useExecuteAuditMatch,
  useGetAuditMatch,
  useGetAuditSummary,
  useGetRankedBoard,
  useListAuditMatches,
} from "@workspace/api-client-react";

const queryClient = new QueryClient();

const colorMeta: Record<string, { label: string; className: string }> = {
  DOUBLE_GREEN: { label: "Double green", className: "double-green" },
  GREEN: { label: "Green", className: "green" },
  YELLOW: { label: "Yellow", className: "yellow" },
  RED_PASS: { label: "Red pass", className: "red" },
  INCOMPLETE: { label: "Incomplete", className: "incomplete" },
};

function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark">TM</div><div><strong>Tennis Matrix</strong><span>Independent audit</span></div></div>
        <div className="sidebar-kicker">Operator console</div>
        <nav>
          <Link href="/" className="nav-link" onClick={() => setMobileOpen(false)}><LayoutDashboard size={17} />Overview</Link>
          <Link href="/board" className="nav-link" onClick={() => setMobileOpen(false)}><Trophy size={17} />Ranked board</Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="system-status"><span className="status-dot" />Engine online<div>Last sync 03:00 UTC</div></div>
          <div className="user-chip"><div className="avatar">AR</div><div><strong>Audit room</strong><span>Analyst workspace</span></div></div>
        </div>
      </aside>
      {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb">Cincinnati Open <ChevronRight size={14} /> <span>Verification slate</span></div><div className="top-actions"><span className="live-chip"><span />Live slate</span><button className="icon-button"><Search size={17} /></button></div></header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}

function Loading({ label = "Loading audit records" }: { label?: string }) {
  return <div className="loading-state"><CircleDashed className="spin" size={22} /><span>{label}</span></div>;
}

function AuditBadge({ color }: { color: string }) {
  const meta = colorMeta[color] ?? colorMeta.INCOMPLETE;
  return <span className={`audit-badge ${meta.className}`}><span className="badge-dot" />{meta.label}</span>;
}

function MetricCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: string }) {
  return <div className={`metric-card ${accent ?? ""}`}><span className="eyebrow">{label}</span><strong>{value}</strong><span className="metric-detail">{detail}</span></div>;
}

function Overview() {
  const [search, setSearch] = useState("");
  const [importedPdf, setImportedPdf] = useState<File | null>(null);
  const [isRunningSlate, setIsRunningSlate] = useState(false);
  const [runResults, setRunResults] = useState<Array<{
    matchId: string;
    matchup: string;
    auditColor: string;
    verification: { player1: { status: string; conclusion: string }; player2: { status: string; conclusion: string } };
    disagreement: { status: string; matrixPick: string; independentPick: string };
    metrics: { player1: Record<string, string>; player2: Record<string, string> };
  }>>([]);
  const summary = useGetAuditSummary();
  const matches = useListAuditMatches({ search: search || undefined });
  const rows = matches.data ?? [];
  const { toast } = useToast();
  const qc = useQueryClient();
  const handlePdfImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "PDF required", description: "Choose a PDF export from Tennis Matrix." });
      return;
    }
    setImportedPdf(file);
    toast({ title: "PDF inserted", description: `${file.name} is ready for parsing.` });
  };
  const runReadyAudits = async () => {
    if (!importedPdf || isRunningSlate) {
      toast({ title: "Import a PDF first", description: "The verification run is gated by the source PDF." });
      return;
    }
    setIsRunningSlate(true);
    try {
      const body = new FormData();
      body.append("pdf", importedPdf);
      const response = await fetch("/api/audit/run-ready", { method: "POST", body });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Audit run failed");
      }
      const result = await response.json();
      setRunResults(result.results ?? []);
      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetAuditSummaryQueryKey() }),
        qc.invalidateQueries({ queryKey: getListAuditMatchesQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetRankedBoardQueryKey() }),
      ]);
      toast({ title: "Verification audit complete", description: `${result.executed} matchups populated with verification, disagreement, and symmetric metrics.` });
    } catch (error) {
      toast({ title: "Audit run failed", description: error instanceof Error ? error.message : "The slate could not be executed. Try again." });
    } finally {
      setIsRunningSlate(false);
    }
  };
  return <div className="page">
    <section className="hero-row"><div><div className="eyebrow accent-label">THURSDAY · 20 AUG 2026</div><h1>Verification slate</h1><p className="lede">Independent evidence review before the Matrix is allowed to speak.</p></div><div className="hero-actions"><label className={`button button-secondary upload-button ${importedPdf ? "upload-ready" : ""}`}><UploadCloud size={16} />{importedPdf ? "PDF inserted" : "Import PDF"}<input type="file" accept="application/pdf,.pdf" onChange={handlePdfImport} /></label><button className="button button-primary" onClick={runReadyAudits} disabled={isRunningSlate || !importedPdf}><Play size={16} />{isRunningSlate ? "Running audits…" : "Run ready audits"}</button></div></section>
    {importedPdf && <div className="imported-file"><div className="file-icon"><FileText size={18} /></div><div><strong>{importedPdf.name}</strong><span>{(importedPdf.size / 1024 / 1024).toFixed(2)} MB · queued for document parsing</span></div><button onClick={() => setImportedPdf(null)} aria-label="Remove imported PDF"><X size={16} /></button></div>}
    <div className="color-legend"><div><span className="eyebrow">RESULT LEGEND</span><strong>Audit outcomes</strong></div><span><i className="legend-dot double-green" />Double green · independently verified</span><span><i className="legend-dot green" />Green · supported</span><span><i className="legend-dot yellow" />Yellow · analyst review</span><span><i className="legend-dot red" />Red / incomplete · do not release</span></div>
    {runResults.length > 0 && <section className="run-results"><div className="run-results-heading"><div><div className="eyebrow">POPULATED AUDIT RESULTS</div><h2>Independent matchup findings</h2></div><span className="run-complete"><Check size={14} /> Verification run complete</span></div>{runResults.map((result) => <div className="result-card" key={result.matchId}><div className="result-card-head"><div><strong>{result.matchup}</strong><span>{result.disagreement.status === "NO_DISAGREEMENT" ? "Matrix and independent conclusion aligned" : "Matrix disagreement reviewed independently"}</span></div><AuditBadge color={result.auditColor} /></div><div className="result-columns"><div><span className="result-label">VERIFICATION AUDIT</span><p><b>P1</b> <em>{result.verification.player1.status}</em> · {result.verification.player1.conclusion}</p><p><b>P2</b> <em>{result.verification.player2.status}</em> · {result.verification.player2.conclusion}</p></div><div><span className="result-label">DISAGREEMENT AUDIT</span><p><b>{result.disagreement.status.replaceAll("_", " ")}</b></p><p>Matrix: {result.disagreement.matrixPick} · Audit: {result.disagreement.independentPick}</p></div><div><span className="result-label">P1 / P2 METRICS</span><p><b>P1</b> {Object.values(result.metrics.player1).join(" · ")}</p><p><b>P2</b> {Object.values(result.metrics.player2).join(" · ")}</p></div></div></div>)}</section>}
    {summary.isLoading ? <Loading /> : summary.isError ? <div className="error-box"><AlertTriangle size={18} />Unable to load slate summary.</div> : <div className="metric-grid">
      <MetricCard label="Matches in slate" value={String(summary.data?.matches ?? 0).padStart(2, "0")} detail="Current event queue" />
      <MetricCard label="Ready to audit" value={String(summary.data?.ready ?? 0).padStart(2, "0")} detail="80%+ execution complete" accent="teal" />
      <MetricCard label="Blocked records" value={String(summary.data?.blocked ?? 0).padStart(2, "0")} detail="Needs analyst attention" accent="orange" />
      <MetricCard label="Complete" value={`${Math.round((summary.data?.greenRate ?? 0) * 100)}%`} detail="Green or double green" accent="lime" />
    </div>}
    <div className="section-heading"><div><div className="eyebrow">ACTIVE SLATE</div><h2>Match queue</h2></div><div className="queue-tools"><div className="search-field"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players or event" /></div><button className="button button-quiet"><Filter size={15} />Filter</button></div></div>
    <div className="match-list">{matches.isLoading ? <Loading /> : matches.isError ? <div className="error-box"><AlertTriangle size={18} />Unable to load matches.</div> : rows.map((match) => <Link href={`/matches/${match.id}`} className="match-row" key={match.id}>
      <div className="match-players"><div className="match-index">{match.id.replace("m-", "")}</div><div><strong>{match.player1}</strong><span>vs</span><strong>{match.player2}</strong></div></div>
      <div className="match-context"><strong>{match.tournament}</strong><span>{match.round} · {match.surface}</span></div>
      <div className="match-pick"><span>Independent pick</span><strong>{match.independentWinner}</strong></div>
      <div className="match-progress"><div className="progress-label"><span>{match.progress}% complete</span><span>{match.status}</span></div><div className="progress-track"><div style={{ width: `${match.progress}%` }} /></div></div>
      <AuditBadge color={match.auditColor} /><ArrowUpRight className="row-arrow" size={18} />
    </Link>)}</div>
    <div className="bottom-note"><ShieldCheck size={16} /><span>Firewall active</span><span className="muted">Matrix-derived evidence is excluded until the independent conclusion is committed.</span></div>
  </div>;
}

function MatchDetail({ id }: { id: string }) {
  const detail = useGetAuditMatch(id);
  const execute = useExecuteAuditMatch();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"evidence" | "execution">("evidence");
  const match = detail.data;
  if (detail.isLoading) return <Loading />;
  if (detail.isError || !match) return <div className="error-box"><AlertTriangle size={18} />This match could not be loaded.</div>;
  const run = () => execute.mutate({ matchId: id }, { onSuccess: () => { toast({ title: "Audit execution complete", description: "The deterministic stages have been refreshed." }); qc.invalidateQueries({ queryKey: getGetAuditMatchQueryKey(id) }); qc.invalidateQueries({ queryKey: getGetAuditSummaryQueryKey() }); qc.invalidateQueries({ queryKey: getListAuditMatchesQueryKey() }); qc.invalidateQueries({ queryKey: getGetRankedBoardQueryKey() }); } });
  return <div className="page">
    <Link href="/" className="back-link">← Back to match queue</Link>
    <section className="detail-hero"><div><div className="eyebrow accent-label">{match.tournament.toUpperCase()} · {match.round.toUpperCase()}</div><h1>{match.player1} <span className="versus">vs</span> {match.player2}</h1><p className="lede">{match.surface} court · {match.scheduled}</p></div><div className="detail-status"><AuditBadge color={match.auditColor} /><button className="button button-primary" onClick={run} disabled={execute.isPending}><Play size={16} />{execute.isPending ? "Executing…" : "Execute audit"}</button></div></section>
    {match.blockers.length > 0 && <div className="warning-strip"><AlertTriangle size={17} /><div><strong>Review required before release</strong><span>{match.blockers.join(" · ")}</span></div></div>}
    <div className="decision-grid"><div className="decision-card"><span className="eyebrow">INDEPENDENT CONCLUSION</span><strong>{match.independentWinner}</strong><span>Verified win rate <b>{Math.round(match.verifiedWinRate * 100)}%</b></span></div><div className="decision-card muted-card"><span className="eyebrow">MATRIX PREDICTION</span><strong>{match.matrixWinner}</strong><span>Matrix win probability <b>{Math.round(match.matrixWp * 100)}%</b></span></div><div className="decision-card firewall-card"><span className="eyebrow">MATRIX FIREWALL</span><strong><Check size={18} />{match.matrixFirewall.status}</strong><span>Independent commitment recorded first</span></div></div>
    <div className="tabs"><button className={tab === "evidence" ? "active" : ""} onClick={() => setTab("evidence")}>Evidence families <span>{match.evidenceFamilies.length}</span></button><button className={tab === "execution" ? "active" : ""} onClick={() => setTab("execution")}>Execution proof <span>{match.executionStages.length}</span></button></div>
    {tab === "evidence" ? <div className="evidence-grid">{match.evidenceFamilies.map((family) => <div className="evidence-card" key={family.name}><div className="evidence-top"><div><span className="eyebrow">{family.category}</span><h3>{family.name}</h3></div><span className={`reliability ${family.reliability.toLowerCase()}`}>{family.reliability}</span></div><div className="comparison"><div><span>Player 1</span><strong>{family.player1}</strong></div><div><span>Player 2</span><strong>{family.player2}</strong></div></div><div className="coverage"><span>Evidence coverage</span><b>{family.coverage}%</b><div><i style={{ width: `${family.coverage}%` }} /></div></div></div>)}</div> : <div className="execution-card"><div className="execution-head"><div><div className="eyebrow">DETERMINISTIC RUN</div><h2>Audit execution chain</h2></div><span className="run-time">Run 04 · immutable snapshot</span></div><div className="stage-list">{match.executionStages.map((stage, i) => <div className="stage-row" key={stage.name}><div className={`stage-icon ${stage.status.toLowerCase()}`}>{stage.status === "COMPLETE" ? <Check size={15} /> : stage.status === "RUNNING" ? <Clock3 size={15} /> : stage.status === "BLOCKED" ? <X size={15} /> : <span>{i + 1}</span>}</div><div><strong>{stage.name}</strong><span>{stage.detail}</span></div><em>{stage.status.replace("_", " ")}</em></div>)}</div></div>}
    <div className="result-strip"><div><div className="eyebrow">RESULT TRACKING</div><strong>Independent audit and Matrix are preserved separately.</strong></div><div className="result-items"><span>Matrix <b>{match.resultTracking.matrixPrediction}</b></span><span>Audit <b>{match.resultTracking.independentAudit}</b></span><span>Final <b>{match.resultTracking.finalSelection}</b></span></div></div>
  </div>;
}

function Board() {
  const board = useGetRankedBoard();
  return <div className="page"><section className="hero-row"><div><div className="eyebrow accent-label">DECISION SURFACE</div><h1>Ranked board</h1><p className="lede">Evidence-weighted selections, ordered by audit confidence.</p></div><div className="board-legend"><span><i className="legend-dot double-green" />Double green</span><span><i className="legend-dot green" />Green</span><span><i className="legend-dot yellow" />Review</span></div></section><div className="board-card">{board.isLoading ? <Loading /> : board.data?.map((row) => <Link href={`/matches/${row.id}`} className="board-row" key={row.id}><div className="rank">#{String(row.rank).padStart(2, "0")}</div><div className="board-player"><strong>{row.independentWinner}</strong><span>{row.player1} vs {row.player2}</span></div><AuditBadge color={row.auditColor} /><div className="confidence"><strong>{Math.round(row.verifiedWinRate * 100)}%</strong><span>{row.confidenceBand}</span></div><div className="board-arrow"><ArrowUpRight size={17} /></div></Link>)}</div><div className="board-footer"><Flame size={16} />Ranked only after independent evidence is committed. Incomplete records never enter the release set.</div></div>;
}

function Router() {
  return <Switch><Route path="/" component={Overview} /><Route path="/board" component={Board} /><Route path="/matches/:id">{(params) => <MatchDetail id={params.id} />}</Route><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><Shell><ErrorBoundary resetKey={location.pathname}><Router /></ErrorBoundary></Shell></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;