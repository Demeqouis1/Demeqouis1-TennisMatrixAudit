# Data Model

The relational model uses immutable version records for summaries, rules, metrics, reconstructions, sources, calibration, and PDF templates. `audit_runs` references the exact versions used, while `execution_logs` preserve the stage-by-stage proof.

Manual correction is append-only in `manual_overrides`: system value, replacement value, actor, timestamp, and reason are all retained. A physical match has one canonical identity and may have many summary versions, but only one calibration ledger entry.
