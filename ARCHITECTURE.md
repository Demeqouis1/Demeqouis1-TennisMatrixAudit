# Architecture

The system is a TypeScript monorepo composed of web, API, worker, audit-engine, source-adapter, reconstruction, database, and PDF-generator modules.

The workflow is persisted as a dependency graph. A surface conflict blocks only surface-dependent calculations for the affected match. Batch execution continues for unaffected matches. Every stage writes an execution log with status, reason codes, inputs, outputs, source provenance, and immutable version identifiers.

Matrix and independent branches are isolated at the contract boundary. The independent branch commits a winner and range before Matrix fields are revealed. The final gate consumes both branches only after the firewall proof is valid.
