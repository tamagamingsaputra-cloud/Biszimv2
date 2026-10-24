# Chat Handoff — BizSim v7.8.1 AI Comparison A

Use this file as context when opening a new chat.

## Project baseline
BizSim v7.8.1 AI Comparison A, derived from `BizSim-v7.8.0-AI-Comparison-A`. This is a separate comparison branch; do not overwrite the original project or Claude's comparison branch.

## User goals
- Serious head-to-head comparison between ChatGPT implementation and Claude implementation.
- Audit before editing; implement rather than only mock up; test before claiming completion.
- Every new package must include PRD or handoff, changelog, and test report.
- Feature pages should have different information architecture and visual identity rather than one repeated generic layout.
- Preserve existing navigation and functioning simulation systems.

## v7.8.1 changes
- Main simulation payroll now requires `career.status === 'employed'` and positive monthly salary.
- Calendar payroll eligibility uses the same active-job/positive-salary condition.
- Removed redundant “full monthly salary at month end” calendar event because salary is paid daily in this simulation model.
- Added `tests/v781-payroll-calendar-test.mjs`.
- Smoke test uses dedicated port 18787 by default to avoid collisions; override with `BIZSIM_TEST_PORT`.
- Package version updated to 7.8.1.

## Test results
`npm run test:all` passed, including syntax, clock/calendar, payroll/calendar guard, Creator Studio engine and UI smoke (13 tabs × 3 platform views), E2E career/business/market/creator, education, and HTTP smoke tests.

## Important honesty notes
- No physical-device visual QA was performed in this run.
- Tests confirm logic guards and current test suites, not every possible saved legacy state or every hosted deployment environment.
- Existing warning: Node `MODULE_TYPELESS_PACKAGE_JSON` for `web/engine/api.js`.
- Twitch and some advanced creator platform features are still limited by capability configuration.

## Next steps
1. Add API-level integration tests for payroll for both unemployed and employed accounts.
2. Validate old saved states with stale salary values but unemployed status.
3. Review local SQLite server and Netlify serverless payroll consistency.
4. Do desktop/mobile screenshot QA and accessibility review.
5. Continue platform-specific Creator Studio refinements without removing older working features.

## Start prompt for a new chat
“Lanjutkan BizSim v7.8.1 AI Comparison A dari file ZIP dan `docs/CHAT-HANDOFF-V7.8.1.md`. Audit source sebelum mengubah. Pertahankan sistem yang berfungsi, jangan mengarang data atau mengklaim tes yang belum dijalankan. Prioritas berikut: API-level payroll integration tests untuk unemployed/employed, audit saved legacy states, lalu visual QA mobile/desktop. Sertakan PRD/handoff, changelog, dan test report pada setiap paket baru.”
