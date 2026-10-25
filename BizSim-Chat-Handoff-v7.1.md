# BizSim v7.1 — Chat Handoff

## Baseline and reference
- Source of truth: uploaded `BizSim.zip`.
- Reference only: `BizSim-v8.4.0-Major-Update-A.zip`.
- Release root: `BizSim-v7.1/`.

## Changes
- Added page-specific accent layer inspired by reference themes.
- Added six local SVG avatars and profile picker (localStorage only).
- Removed Creator Studio QA age override from Settings and engine age calculation.
- Kept legacy YouTube ledger records for compatibility; changed their display label rather than deleting saved history.
- Set same-origin API calls; added Vercel catch-all and `/api` entrypoints.
- Express app exports cleanly for function use; temporary DB path uses `/tmp` when Vercel environment is detected.

## Test status
- Calendar: PASS, 23 checks.
- Needs: PASS, 13 checks.
- Changed JS syntax: PASS.
- Finance tests: NOT RUN because dependencies are absent in the authoring environment.
- Live Vercel deployment and Android visual QA: NOT RUN.

## Critical limitation
SQLite under `/tmp` is ephemeral on Vercel. Use a managed persistent database before relying on saved data in production. Do not claim durable save persistence until migration and deployed tests pass.

## Next steps
1. Deploy to a Vercel Preview first.
2. Verify `/api/health` and test new character creation, reload, education progression, finance transactions and Creator Studio.
3. Check whether state persists after separate requests/cold starts; if not, migrate to a managed database.
4. Run full `npm install` and finance test suite, then Android viewport checks.
