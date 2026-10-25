# Test Report — BizSim v8.0.0

## Automated tests
- JavaScript syntax checks: PASS.
- Simulation clock/calendar: PASS.
- Payroll/calendar regression guards: PASS.
- Creator engine and UI smoke (13 tabs × 3 platforms): PASS.
- E2E career/business/market/creator/persistence: PASS.
- Education bank/engine/UI checks: PASS; 26,112 questions checked, 0 flagged by tests.
- HTTP smoke: PASS when run with `BIZSIM_TEST_PORT=18891`.

## Environment note
The first full run failed at the smoke test's root check on its default port; an isolated run on port 18891 passed all smoke checks. This is treated as a possible test-port collision, not as a product regression. Re-run full suite with `BIZSIM_TEST_PORT=18891 npm run test:all`.

## Not tested
- Physical Android device / Vercel visual regression after CSS changes.
- Full browser screenshot comparison at 320px, 360px, 390px, 430px and desktop widths.
- Every feature-specific layout, because the CSS layer is additive and some page classes still need mapping to rendered roots.
