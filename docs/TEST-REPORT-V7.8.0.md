# Test Report — BizSim v7.8.0 AI Comparison A

Date: 2026-10-24

## Result
`npm run test:all` completed with exit code 0.

## Suites included
- Syntax checks for server, web and Netlify function modules.
- Simulation clock/calendar and life state tests (`tests/v740-clock-test.mjs`).
- Creator engine and UI smoke (`tests/creator-studio-test.mjs`, `tests/creator-ui-smoke.mjs`).
- End-to-end engine (`tests/e2e-engine-test.mjs`).
- Education bank, workflow and UI smoke tests.
- Application smoke tests for health, root, app.js, register/session, `/me`, jobs, simulate day and logout.

## Notable assertions observed
- Calendar: 12 months × 30 days; date rollover, pause/speed, persistence and life needs passed.
- Creator: platform account and format validation, staged production, spending, publishing, views, live session, eligibility-locked gifts, platform fees, payout and persistence passed.
- Creator UI smoke: 13 tabs across 3 enabled platforms rendered without errors/NaN.
- E2E: career application, 15-item business catalog, market BUY/SELL and creator persistence passed.
- Education bank: 26,112 questions checked; 0 reported issues.
- App smoke suite passed.

## Warnings and limitations
- Node emitted non-fatal `MODULE_TYPELESS_PACKAGE_JSON` warnings for `web/engine/api.js`.
- This is an automated test run; no physical-device or full browser visual regression test was performed.
- Existing test success does not establish that the user's separate unemployed daily salary issue is resolved; that remains an explicit open issue.
