# Source Governance

Sources are registered with tier, reliability, approval, blacklist, supported metrics, refresh schedule, health, quota, fetch history, and conflict history. Official identity, event, surface, draw, status, and result sources have precedence over specialist, market, and news sources for their respective fields.

A source failure produces `PREFERRED_SOURCE_FAILED` and may trigger a permitted fallback. A disagreement is never silently resolved: selected value, alternatives, magnitude, timestamps, reliability, and selection reason are persisted.
