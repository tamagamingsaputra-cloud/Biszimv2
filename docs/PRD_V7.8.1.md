# BizSim v7.8.1 — PRD & Engineering Handoff

## Baseline
- Source: `BizSim-v7.8.0-AI-Comparison-A`.
- This is AI Comparison A; keep its project root separate from the original BizSim and any AI Comparison B.
- Existing global navigation, legacy features, career/business/market/education engines, creator engine v7.3.1, and simulation clock v7.4.0 are preserved.

## Purpose
Stabilize payroll/calendar semantics and the Creator Studio integration without replacing working simulation systems or claiming unsupported platform features.

## Payroll rules
1. Salary is paid only when `career.status === 'employed'` and monthly salary is a positive number.
2. Daily salary is derived from the active job contract as `round(monthlySalary / 30)` in the daily simulation endpoint.
3. Unemployed characters receive no employment salary and should not see a salary event in the calendar.
4. Salary notifications are emitted only when a positive payroll amount is paid.
5. Creator income, business cash flow, and investment results remain separate sources of income.

## Calendar rules
- Calendar date/time remains driven by simulation state, not real-world time.
- Work blocks require active employment; salary events require active employment and positive salary.
- The calendar no longer advertises a second “full monthly salary” payout at month-end because this version pays daily; that would imply duplicate compensation.
- Loans, education, creator publishing, investments, and other event sources remain state-derived where supported.

## Content Creator Studio scope
- Overview, platform accounts, planner, content creation, queue, published content, live studio, analytics, monetization, sponsorship, skills/equipment, and legacy features remain available.
- Platform capability rules and monetization are simulation rules, not claims about current official platform policy.
- Creator progression remains optional and does not replace the primary Career & Jobs system.
- Content progress, publication, live state, gifts, payouts, and analytics must come from engine state, not UI-only animation.

## Preserved systems / constraints
- Keep the global navigation and existing feature routes.
- Keep separate visual identities for Asset Market, Investments, Business, Career & Jobs, and Creator Studio.
- No invented business catalog entries in UI; use the catalog in source.
- No fake transaction buttons or fabricated progress.
- SIMULATED data must not be presented as real market/platform data.
- Preserve mobile-first behavior and legacy features that still work.

## Changes in v7.8.1
- Tightened payroll eligibility in the main simulation endpoint: active status and positive salary are both required.
- Tightened calendar payroll eligibility with the same condition.
- Removed the calendar's misleading second monthly-salary event, since payroll is daily in this model.
- Added payroll/calendar regression guard tests.
- Fixed smoke test port collision by using a dedicated configurable test port (`BIZSIM_TEST_PORT`, default 18787).
- Updated package version to 7.8.1.

## Acceptance criteria
- An unemployed new player has zero employment payroll.
- An employed player with a positive salary receives daily pay derived from the active job salary.
- No salary calendar event is generated for unemployed or zero-salary states.
- No duplicate month-end full-salary event is shown under daily-pay rules.
- Creator, career, business, market, education, calendar, and smoke tests pass.

## Test status
`npm run test:all` passed in the build environment on Node 22.16.0. This includes syntax checks, v7.4 clock/calendar tests, v7.8.1 payroll/calendar guards, Creator Studio engine/UI smoke tests, E2E engine tests, education suites, and HTTP smoke tests.

Warnings: Node emits a `MODULE_TYPELESS_PACKAGE_JSON` warning for an existing `web/engine/api.js` module. It did not fail tests and was not changed as part of this patch.

## Known limitations / next steps
- Automated tests are not equivalent to manual visual QA on a physical Android device and desktop browser.
- Some advanced platform capabilities (including Twitch) remain disabled or incomplete per platform capability configuration.
- Payroll integration is guarded by tests and the main simulation endpoint, but further integration testing should cover every deployment path (local SQLite and Netlify Blobs) and saved legacy player states.
- Audit whether the legacy local server and serverless API should share one payroll service; their architecture currently differs.
- Continue UI accessibility, keyboard navigation, responsive screenshot checks, and creator payout edge-case testing.
