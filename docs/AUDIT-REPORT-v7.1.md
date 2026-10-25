# BizSim v7.1 — Audit Report

## Source of truth
- Main project: `BizSim.zip` (88 files before changes).
- Reference only: `BizSim-v8.4.0-Major-Update-A.zip` (293 files before changes).
- The reference uses a different architecture and was not copied over the main project.

## Findings
1. Main project is a static `public/` frontend with an Express API in `server/server.cjs`; its database uses native `better-sqlite3`.
2. Frontend API URL used an unresolved `__PORT_8000__` placeholder, causing deployed clients to fall back to localhost or fail to reach the API.
3. The server started listening immediately on import, preventing clean use as a serverless handler.
4. Vercel serverless functions do not provide durable local SQLite storage. A `/tmp` database can make the API writable but cannot guarantee cross-invocation persistence.
5. Creator Studio had a Settings checkbox that made creator age appear as 18 for testing; this bypass is removed. Creator eligibility now reads simulated character age. Existing eligibility logic is still primarily client-side; complete endpoint-level enforcement is not claimed.
6. Profile used a generated initial instead of selectable built-in avatars.
7. The old YouTube ledger label is retained for backwards-compatible saved data but renamed in the UI to identify it as legacy creator history; records are not deleted.

## Changes applied
- Added Vercel API entrypoints and exported the existing Express app without auto-listening when imported.
- API URL is same-origin on deployment.
- Vercel runtime uses `/tmp/bizsim.db` only as a temporary runtime workaround.
- Added six local SVG avatars and browser-local avatar selection.
- Added page-specific accent tokens and responsive/reduced-motion rules inspired by the reference.
- Removed the Creator Studio QA age bypass.
- Added root package metadata and Vercel configuration.

## Validation
- `node --check` passed for changed JavaScript server/UI/API files.
- `node tests/calendar.test.mjs`: PASS (23 checks).
- `node tests/needs.test.mjs`: PASS (13 checks).
- ZIP integrity: checked after packaging.
- Finance API tests and live Vercel deployment were not run: `express` and `better-sqlite3` are not installed in this authoring environment, and no Vercel deployment/log access was available.
- Physical Android visual QA was not performed.

## Blocking production limitation
Do not treat this build as durable multi-user Vercel deployment. To persist profile, education, finance and game progress reliably on Vercel, replace local SQLite with a managed persistent database and test the deployment. The current adapter only addresses API routing/runtime startup, not durable storage.
