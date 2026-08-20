CREATE TABLE audit_runs (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL,
  status TEXT NOT NULL,
  audit_color TEXT,
  rule_version_id UUID NOT NULL,
  formula_version_id UUID NOT NULL,
  calibration_version_id UUID NOT NULL,
  source_snapshot_version_id UUID NOT NULL,
  independent_decision_committed_at TIMESTAMPTZ,
  matrix_revealed_at TIMESTAMPTZ,
  audit_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE execution_logs (
  id UUID PRIMARY KEY,
  audit_run_id UUID NOT NULL REFERENCES audit_runs(id),
  stage TEXT NOT NULL,
  rule_id TEXT,
  player_id UUID,
  input_provenance JSONB NOT NULL,
  output_value JSONB,
  status TEXT NOT NULL,
  reason_codes TEXT[] NOT NULL DEFAULT '{}',
  rule_version_id UUID,
  formula_version_id UUID,
  matrix_visibility TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE manual_overrides (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  system_value JSONB NOT NULL,
  manual_override JSONB NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  document_type TEXT NOT NULL,
  version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  parse_completeness JSONB NOT NULL,
  status TEXT NOT NULL,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_type, version)
);

CREATE TABLE calibration_ledger (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL,
  master_sequence_number INTEGER NOT NULL,
  matrix_wp NUMERIC,
  bucket TEXT,
  result_type TEXT NOT NULL,
  result_grade TEXT NOT NULL,
  counted_in_calibration BOOLEAN NOT NULL,
  calibration_version_before UUID NOT NULL,
  calibration_version_after UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id)
);

CREATE TABLE summary_pages (
  id UUID PRIMARY KEY,
  summary_version_id UUID NOT NULL,
  page_number INTEGER NOT NULL,
  extraction_method TEXT NOT NULL,
  processing_status TEXT NOT NULL,
  raw_text TEXT,
  parser_confidence NUMERIC,
  UNIQUE (summary_version_id, page_number)
);
