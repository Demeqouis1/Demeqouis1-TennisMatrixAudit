# Tennis Matrix Independent Verification & Audit System

This repository implements a deterministic audit engine. It proves work through persisted execution state; generated prose is never completion evidence.

## Core contract

- Matrix outputs are a benchmark and cannot determine the independent audit.
- Player 1 and Player 2 receive symmetric treatment for every applicable metric.
- No execution record means no completion.
- AI-assisted research may interpret evidence, but application code owns completion and Green eligibility.

## Development

```sh
cp .env.example .env
npm install
npm run typecheck
npm test
npm run build
```

The supplied audit PDFs remain the governing source documents. They are intentionally preserved as repository inputs under `Audit/` and `Disagreement audit`.
