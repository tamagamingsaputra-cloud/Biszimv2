# BizSim v7.6.1 — Structural UI Layout Update

This package builds on the provided BizSim v7.6.0 UI/UX package and changes page layout structure, not only colors or decorative styling.

## Layout changes
- Desktop: fixed-width, sticky left navigation; sticky topbar; wider content canvas and consistent page gutters.
- Dashboard: distinct welcome/wealth area, status strip, and more deliberate KPI and action zones.
- Asset Market: clearer asset-list/card hierarchy and responsive market layout; existing simulated market behavior is untouched.
- Investments: clearer separation from trading and a more structured page grid.
- Business: catalog cards use a consistent image/facts/action hierarchy.
- Career & Jobs: job cards use a compact illustration/details arrangement and a clearer two-column desktop layout.
- Mobile: content stacks into one column, sidebar becomes an off-canvas drawer using the existing `.mobile-open` class, and the existing mobile navigation remains intact.
- Focus visibility and reduced-motion preferences are preserved.

## Safety / scope
- No global navigation route IDs were changed.
- No business, market, investment, career, or education engine logic was intentionally modified.
- The additional stylesheet is `web/v761-layout.css`, loaded after `v760-ui.css`.

## Validation
`npm run test:all` passed on this package after the layout update.
