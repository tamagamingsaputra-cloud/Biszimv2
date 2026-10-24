# Changelog — v7.8.1

## Fixed
- Payroll in the main simulation endpoint now requires an active employed status and a positive salary.
- Calendar salary events now require the same eligibility condition.
- Removed misleading month-end “full salary” event that duplicated the daily-pay model in the calendar UI.
- Smoke tests now use a configurable dedicated port to avoid unrelated processes causing a false root-route failure.

## Preserved
- Global navigation and existing route structure.
- Business, market, career, education, creator, and simulation engines.
- Creator Studio platform capability rules and existing legacy feature access.

## Tests
- `npm run test:all` — PASS on Node 22.16.0.
- Existing module-type warning remains for `web/engine/api.js`; no test failure resulted.

## Not claimed
- No physical Android/desktop visual QA in this run.
- No claim that every advanced platform capability is implemented; see `PRD_V7.8.1.md`.
