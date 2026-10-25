# Test Report — BizSim v8.2.1 AI Comparison A

**Environment:** Node.js v22.16.0.  
**Command:** `npm run test:all`  
**Final result:** PASS (exit code 0).

## Checks passed
- Syntax checks for server, frontend modules and Netlify functions.
- V740 clock/life: 12-month × 30-day calendar, pause/speeds, needs ranges, meals, sleep, work schedule/payroll and reload persistence.
- Payroll/calendar regression guards: unemployed players do not receive a salary; calendar salary markers require active employment and positive salary; duplicate monthly event removed.
- Creator engine: creator queue, production tick, stage progression, publish, gifts/payout and persistence flows.
- Creator UI smoke: 12 tab/area contexts across 3 platform configurations render without JS error/NaN.
- Engine E2E: career application, 15 business types, insufficient capital rejection, BUY/SELL and holdings validation, content publish and persistence.
- Education: deterministic bank check examined 26,112 questions with zero detected malformed questions; course, attendance, exams, remedial, graduation and employment requirement tests passed.
- HTTP smoke: health, root, app.js, registration, session cookie, /api/me, jobs, simulate day, logout and revoked session.
- v8.2.1 UI invariant test: version/style loading, shell no repeated hero, no injected floating control, local deployed SVG assets exist, modal body scroll/footer availability, dark stock sheet/trading CTA, market order/limit condition, creator icon stage color and wait-day engine state.

## Fixes made while testing
The HTTP smoke test previously used fixed port 18787 and could fail when another process occupied that port. It now reserves an available local port by default; `BIZSIM_TEST_PORT` can still be specified for deterministic environments. Full suite was rerun successfully after this change.

## Non-blocking warning
Node reports `MODULE_TYPELESS_PACKAGE_JSON` for `web/engine/api.js` because it contains module syntax under a package without global `type: module`; Node reparses it as ESM. Changing the root package to module mode would risk breaking the CommonJS server and was intentionally not done in this release.

## Not verified
- Chromium headless was available, but attempts to open both localhost and file URLs were blocked by the execution environment policy (“Your organization doesn’t allow you to view this site”), so application-level screenshots could not be captured.
- Not tested on a physical Android phone, multiple device aspect ratios, desktop Safari/Firefox or the live Vercel deployment.
- Therefore “PASS” covers automated engine/source-level checks, not complete visual certification; this limitation is explicit rather than treated as a visual pass.

- Post-audit structural assertions cover route titles for the actual `invest` view, dedicated brand icon, removal of the duplicated v6 investment summary, and emerald styling for the route actually used by Investment Hub.

## v8.2.1 additional checks
- Structural UI test asserts the legacy `dash2()` composition is not appended below the v740 dashboard modules.
- Structural UI test asserts dashboard profile/clock flex order stays aligned and route-specific investment titles, brand SVG, and clean modern Investment Hub remain present.
- The test suite was run after these code changes; visual browser capture on the real deployment remains unavailable in this environment.

## Visual certification boundary
The environment blocked browser navigation to localhost and file URLs, so there is no genuine post-change browser screenshot in this report. The structural defect was identified in the real renderer chain and covered with source invariant tests, but phone-specific visual inspection still requires deployment to a preview URL.
