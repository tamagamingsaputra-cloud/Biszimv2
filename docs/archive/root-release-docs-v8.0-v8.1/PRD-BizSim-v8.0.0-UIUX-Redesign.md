# BizSim v8.0.0 — UI/UX Redesign PRD

## Baseline
- Source baseline: BizSim v7.9.0 AI Comparison A.
- New root folder: `BizSim-v8.0.0-AI-Comparison-A`.
- Global navigation and simulation/business/career/market/education/creator engines remain in place.

## Goals
1. Repair responsive layout risks evidenced by Android screenshot: clipped profile, content hidden by bottom navigation, overlapping floating action button, dense mobile cards.
2. Establish feature-specific visual identities rather than one universal card layout.
3. Give Asset Market a dedicated dark navy terminal aesthetic inspired by the supplied reference: near-black navy, deep teal panels, green positive movement, red negative movement, compact data layout.
4. Include actual local SVG assets in the repository and wire the market illustration into the page CSS.
5. Preserve data truth: market values and chart history remain from the simulation engine; the illustration is decorative only.

## Visual tokens
- Market background `#061521`, panel `#0B2231`, panel secondary `#102B3B`, border `#1D3B4B`.
- Market positive `#20D38A`, negative `#FF5D6C`, cyan `#43C9DC`.
- Dashboard remains light and information-first.
- Investments: emerald; Business: terracotta; Career: indigo/violet; Education: blue; Profile: antique gold/slate; Creator Studio: violet.
- Icon guidance: vector SVG, consistent 24x24 viewBox, no emoji icons.

## Layout rules
- Profile/banner heights must be content-driven, with wrapping names and flexible portrait dimensions.
- Mobile content reserves space for bottom navigation and Android safe area.
- Floating action button stays above bottom navigation.
- Controls provide visible keyboard focus and touch targets.
- Respect `prefers-reduced-motion`.
- Trading screen is data-dense and dark; business and career remain catalog/task oriented; education remains learning oriented.

## Asset pack
`assets/uiux-v800/icons/*.svg` includes dashboard, market, investments, business, career, education, profile, people, calendar, wallet, creator and notification icons.
`assets/uiux-v800/illustrations/market-terminal.svg` is loaded by `web/v800-redesign.css` as the Asset Market header illustration. It contains no live or fabricated quote data.

## Non-goals / known limitations
- This is a responsive design layer over existing pages, not a full rewrite of every page renderer.
- The additional SVG icon files are bundled as local assets, but the current navigation renderer still uses its existing inline vector icon system; migration to `<img>`-based local icons should be incremental to avoid regressions.
- Automated tests do not substitute for physical Android visual regression. Verify on deployed preview at 320–430 CSS px and desktop widths.
- No features were deleted in this release; remove legacy functionality only after usage and dependency audit.

## Acceptance criteria
- Existing automated regression suite passes.
- Market has dedicated dark palette and local SVG header artwork.
- Profile text can wrap without fixed-height clipping.
- Bottom navigation safe-area spacing and page bottom padding are present.
- All existing simulation engines and routes remain in source.
