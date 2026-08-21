# Audit Compliance Map

**Status:** Sanitized public/reconstructable edition

## Source Policy
The active audit inputs and runtime metric registry contain only public or transparently reconstructed match evidence. Values require source provenance, retrieval date, sample size, method, reliability, and availability. Missing data is marked `UNAVAILABLE`; unsupported methods are `EXCLUDED` and carry zero decision weight.

## Active Runtime Surfaces
- Uploaded PDF matchup extraction and provenance in `audit-engine/pdf-matchup.ts`.
- Shared confirmed Player 1 and Player 2 identity in `audit-engine/pdf-run.ts`.
- Symmetric active metric handling in `audit-engine/invariants.ts`.
- Independent evidence-family counting in `audit-engine/compliance.ts` and `audit-engine/gate.ts`.
- Completion, firewall, contradiction, stress, and calibration gates in `audit-engine/gate.ts` and `audit-engine/invariants.ts`.
- Uploaded-PDF provenance persistence in `db/migrations/001_initial_audit_schema.sql`.

## Active Metric Families
1. Match identity, event, surface, format, round, and result.
2. Public rankings and public rating differentials.
3. Public surface records with declared sample sizes.
4. Public serve and return statistics.
5. Public recent form with opponent quality and surface context.
6. Public head-to-head and common-opponent context.
7. Public pre-commitment market context.
8. Verified calibration observations.

## Enforcement
- Player 1 and Player 2 are verified symmetrically.
- Correlated signals are deduplicated by evidence family.
- Matrix-derived signals never increase independent evidence.
- The audit cannot complete with missing execution records or unresolved critical contradictions.
- The PDF source-of-truth gate blocks all three audit stages until the uploaded matchup is confirmed.
- There is no production identity fallback or prior-run identity reuse.

## Removed From Scope
Unavailable, non-public, proprietary, private, instrumented, hidden-formula, unsupported-analogue, and unsupported fine-grained tracking measures are not active rules or metrics. They cannot be used to populate an audit, raise confidence, satisfy a completion gate, or influence a color classification.
