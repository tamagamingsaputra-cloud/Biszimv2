# Chat Handoff — BizSim v8.2.1 AI Comparison A

## Current baseline
- Current project: `BizSim-v8.2.1-AI-Comparison-A/`.
- Immediate source baseline: BizSim v8.2.0 AI Comparison A; historical source family begins at v8.1.0.
- Purpose: compare this implementation against an independent Claude implementation. Do not merge or overwrite the other variant.

## Changes made
- New application shell: `web/v730-shell.js` and `web/app.js` route integration; dashboard-only profile strip rather than a global duplicate hero.
- Global floating `.fab` day-simulation control no longer injected; use the actual dashboard clock actions.
- `web/v820-layout-fixes.css` loaded after prior theme sheets; page-specific layout/color treatments and safe-area behavior.
- Local assets copied/generated under `web/assets/uiux-v820/` and loaded via SVG sprite. The `web/` root is the deploy publish folder.
- Stock modal scroll/footer and market-vs-limit field behavior updated in `web/v700-invest.js` and CSS.
- Creator queue stages, icon/color timeline and simulation-day gating updated in `web/v730-creator2.js` and `netlify/functions/v731-creator.mjs`; generated local engine scripts synchronized.
- Smoke tests use a free local port by default.

## Preserve
- Existing global route IDs and nav concepts.
- Career/payroll, simulation clock, life needs, business engine, market/trading, long-term investments, education and Creator backend/persistence.
- Market is simulated; don't connect or claim live exchange data.
- Creator is optional career/side income, not a generic business.

## Test status
`npm run test:all` passed on Node.js v22.16.0, including syntax, v740 clock/life tests, payroll/calendar guard, Creator engine/UI smoke, E2E, education suite, HTTP smoke and v821 UI invariant checks.

## Known limitations
- No real-device Android visual test or Vercel deployment verification has been performed. Chromium headless attempts were blocked by environment policy for both localhost and file URLs, so a post-change screenshot could not be obtained here.
- `MODULE_TYPELESS_PACKAGE_JSON` warning for `web/engine/api.js` is still non-fatal.
- Creator platform capabilities not implemented in the underlying engine remain limited; do not pretend full Twitch/other-platform feature parity exists.
- The previous user screenshot at `bizsim-v7.vercel.app` represents the older deployed version. Changes in this source ZIP do not appear on that URL until the user deploys this variant.

## Next tasks
1. Extract/deploy to a separate Vercel project/preview (avoid replacing Comparison B).
2. On Android, test Dashboard, BBCA stock sheet with market/limit order, leveraged trading hub, Creator create/start, skip one simulation day, and verify Editing → Review → Upload → Ready.
3. Capture screenshots at width ~360–400 CSS px and verify no name/card/modal/action overlap.
4. If a visual defect remains, capture the exact screen and inspect the deployed version/commit before further code edits.
5. Continue platform capability expansion only where engine and tests can support it.

## v8.2.1 follow-up
- The user screenshots still showed the old deployed v7 domain. The root cause discovered in source was deeper than CSS: `v740-clock.js` added the new time/needs panel but `v730-dashboard2.js` also appended the legacy `dash2()` page-head/KPI/static-chart section underneath it. v8.2.1 removes that legacy dashboard content from the active composition.
- The old static chart and duplicate metrics were UI surfaces only; core simulation state and engine modules remain.
- Added regression test requiring the active dashboard composition to omit `dash2()` and preserve the expected flex order.
- Topbar route names now identify `invest` as Trading Terminal or Investment Hub based on selected tab; the unused legacy aggregate `Investasi lama (v6)` is removed from Investment Hub.
