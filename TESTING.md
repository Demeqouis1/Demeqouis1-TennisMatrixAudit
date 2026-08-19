# Testing

Critical tests cover P1/P2 symmetry, Matrix firewall ordering, dependency-scoped blocking, complete rule parsing, complete page accounting, reconstruction provenance, freshness and research locks, post-start exclusion, duplicate match and grading protection, retirement/withdrawal policies, calibration integrity, ranked-board ordering, PDF reconciliation, and deterministic completion proof.

CI runs typecheck, tests, and build. Production release gates must additionally run migration, integration, PDF, and invariant suites against the configured database.
