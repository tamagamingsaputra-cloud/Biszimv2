# PRD — BizSim v7.1 (source-preserving integration)

## Objective
Apply selected UI and deployment improvements from the v8.4 reference to the original `BizSim.zip` project without replacing its simulation systems or directory layout.

## Requirements in this patch
- Preserve original `public/`, `server/`, `docs/`, and `tests/` systems and their data contracts.
- Keep dashboard, life/needs, calendar, education, finance, market, investments, business, career, and Creator Studio flows.
- Give feature pages distinct accent identities while retaining BizSim's navy/white design foundation.
- Provide selectable local avatar assets on the character profile.
- Remove the Settings-based Creator Studio age bypass.
- Route browser API calls same-origin and provide Vercel API entrypoints.
- Clearly disclose that `/tmp` SQLite is ephemeral and not durable production persistence.

## Non-goals / not claimed
- This is not a full port of the v8.4 architecture.
- Avatar selection is browser-local, not server-synced.
- No full server-authoritative age gate migration has been completed.
- No managed database has been configured.
- No live Vercel or physical-device visual QA has been completed.

## Acceptance evidence
- Calendar regression tests pass.
- Needs simulation regression tests pass.
- Changed JavaScript syntax checks pass.
- Archive integrity passes.
