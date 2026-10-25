# Changelog — BizSim v8.2.1 AI Comparison A

## Structural UI
- Replaced duplicate generic page hero/snapshot with compact Dashboard-only profile strip.
- Rebuilt global app shell and mobile nav labels, account controls and icon wiring.
- Removed obsolete floating simulation-day button injected after rendering.
- Added responsive page-specific skins for dashboard, market/trading, investments/portfolio, business/operations, career, education, profile and Creator Studio.
- Added safe-area-aware content spacing, fixed/sticky CTA behavior, and smaller-width layout rules.
- Added local SVG icon files plus sprite and market terminal illustration under deployed `web/assets/uiux-v820/`.

## Trading
- Stock modal has fixed header/footer and independent body scrolling.
- Market order no longer shows the limit price; limit-order validation remains active.
- Dark navy stock chart/sheet appearance and mobile trading action tray.

## Creator Studio
- Replaced plain stage indicator with icon-led progress timeline and semantic colors (red scissors for Editing, teal upload-cloud for Upload).
- Enforced a full simulated-day wait after starting production, with zero progress/spend during the wait day.
- Queued waiting jobs do not consume active slots; progress/cost advances only on the simulation day tick.
- Production duration uses a duration factor, so longer content takes longer in-game.
- Removed references to obsolete legacy Creator tab from the Creator UI smoke coverage.

## QA
- Smoke test now obtains an available local port automatically unless `BIZSIM_TEST_PORT` is explicitly set, removing failure when the old fixed port is occupied.
- Added `tests/v821-ui-layout-test.mjs` for shell, modal, assets, market order form, CTA and creator state/style invariants.
- Full `npm run test:all` passed in Node.js v22.16.0.

## Boundaries
- No user Vercel deployment was run.
- No Android physical-device screenshot/browser automation was run.
- Existing engines and legacy feature modules remain; only redundant shell UI/legacy Creator tab references were removed.

## Post-audit refinements (same v8.2.1 package)
- Added explicit top-bar titles for routes not present in the legacy primary navigation array, including Trading Terminal vs Investment Hub, Education, Creator Studio, News, Events Hub and Profile.
- Replaced the generic chart glyph in the application brand mark with the dedicated local BizSim brand SVG.
- Removed the duplicated `Investasi lama (v6)` aggregate from Investment Hub; the main portfolio and investment categories remain.
- Added the emerald page token to the current `invest` route so Investment Hub is not left with generic styling.
- Extended structural tests for these regression cases.

## v8.2.1 structural fix
- Removed the legacy dashboard renderer from the current Dashboard composition. The outdated greeting/KPI stack and decorative static financial chart were duplicating the clock/needs interface and contributing to overlay/clipping on mobile. The life-summary, date/debt/level strip, investment summary, owned businesses and recent activity remain.
- Corrected Dashboard flex order so the profile strip precedes the time/needs module, with support panels following in document order.
- Added explicit regression assertions for the no-duplicate-dashboard invariant.
