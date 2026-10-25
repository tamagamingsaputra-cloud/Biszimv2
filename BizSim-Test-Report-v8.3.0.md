# BizSim v8.3.0 — Test Report

## Automated results
- `npm run check` — PASS
- `npm run check:v740` — PASS
- `npm run check:v750` — PASS
- `npm run test:v740` — PASS (calendar, needs, pause/speed, activity and payroll cases)
- `npm run test:v781` — PASS (payroll/calendar regression)
- `npm run test:creator` — PASS (creator simulation + 13 tabs × 3 platform UI smoke)
- `npm run test:e2e` — PASS (career application, 15 business catalog types, market buy/sell and holding validation, creator queue/publish/persistence)
- `npm run test:education` — PASS (26,112 deterministic questions; SD/SMP/SMA/SMK/university, exams, fees, graduation and education-job requirements)
- `BIZSIM_TEST_PORT=18891 npm run test:smoke` — PASS (health, root, app.js, registration, session, /api/me, jobs, simulate day, logout and session revocation)
- Full suite command with unique test port: `BIZSIM_TEST_PORT=18891 npm run test:all` — PASS.

## Warnings / limitations
- Node emits a non-blocking `MODULE_TYPELESS_PACKAGE_JSON` warning for `web/engine/api.js` during some tests.
- Automated checks do not certify visual rendering on a physical Android device. Manual visual regression is still required at 320, 360, 390, 430 CSS px and desktop widths.
- The new CSS page accents rely on page-root classes; verify each route visually because legacy renderers do not all expose a unique root class.
- Added SVG avatar samples are bundled assets; the existing interactive procedural avatar editor remains the connected profile avatar workflow.
- Global server-side age gates for creator work and other age-restricted activities were not implemented in this release and are documented as follow-up work, rather than being hidden only in the UI.
