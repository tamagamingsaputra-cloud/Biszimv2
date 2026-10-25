
## Current iteration: v8.1.0
Creator production is day-tick gated, video-duration aware, and uses icon-led stage progress. See `PRD-BizSim-v8.1.0.md`, `BizSim-Test-Report-v8.1.0.md`, and `BizSim-Chat-Handoff-v8.1.0.md`.

# BizSim v7.8.1 — AI Comparison A

Incremental improvement release based on the v7.8.0 AI Comparison A package. The project is intended for side-by-side evaluation against another AI implementation. Keep this folder separate from the original baseline and Comparison B.

## v7.8.1 highlights
- Payroll is conditional on active employment and a positive salary.
- Calendar salary events follow the same eligibility rule; duplicate month-end salary messaging was removed from the daily-pay model.
- Creator Studio engine/UI tests and existing simulation suites are retained.
- Smoke test uses port 18787 by default to avoid collisions; set `BIZSIM_TEST_PORT` to change it.
- PRD, handoff, changelog, and test report are in `docs/`.

## Local development
Requires Node.js 22+. Run `npm install`, then `npm start`; open `http://localhost:8787`.

## Tests
Run `npm run test:all`. Last recorded run passed on Node v22.16.0. See `docs/TEST-REPORT-V7.8.1.md` for the suite summary and limitations.

## Important limitations
Automated tests do not replace visual QA on a physical Android device and desktop browser. Some advanced creator platform capabilities remain disabled/incomplete. An existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains for `web/engine/api.js`.

## Project documentation
- `docs/PRD_V7.8.1.md` — current PRD and constraints
- `docs/CHAT-HANDOFF-V7.8.1.md` — continue in a new chat
- `docs/CHANGELOG_V7.8.1.md` — changes from v7.8.0
- `docs/TEST-REPORT-V7.8.1.md` — test results and caveats

---

## Historical baseline note
This package retains historical release notes and original feature documentation for traceability. Those older documents describe earlier releases and should not be mistaken for the current package version.
