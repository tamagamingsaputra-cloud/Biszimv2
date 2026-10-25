# BizSim v7.9.0 — Mobile UI Repair PRD

## Baseline
- Source baseline: BizSim v7.8.1 AI Comparison A.
- Evidence: Android screenshot supplied on 2026-10-25 showing the profile welcome banner clipped, dense dashboard cards, and bottom navigation overlapping content.

## Goals
1. Ensure dashboard profile name and profile summary are never clipped on narrow screens.
2. Keep bottom navigation clear of page content and Android safe-area insets.
3. Prevent floating action controls from overlapping the bottom navigation.
4. Improve information density and readability for simulation clock and character needs.
5. Give market, investments, business, career, creator, and dashboard page headers distinct accent identities without replacing global navigation.
6. Preserve simulation state, server APIs, engines, career, business catalog, and Creator Studio behavior.

## Implementation
- Added `web/v790-mobile-polish.css` as a final, isolated override layer.
- Included the stylesheet in `web/index.html`, including the no-JavaScript stylesheet fallback.
- Updated package metadata and browser title/loading copy to v7.9.0.
- Profile welcome area now has auto height, visible overflow, wrapping text, and responsive portrait sizing.
- Mobile nav has constrained width, explicit z-index, safe-area-aware position, and wrapping labels.
- Main content receives safe clearance below the fixed navigation.
- Life dashboard cards use a distinct top-edge accent and responsive needs grid.
- Page-specific accent tokens distinguish dashboard, market, investments, business, career, and creator pages.

## Acceptance criteria
- At widths 320, 360, 390, 430, and 768 CSS px, profile name and career chip wrap instead of being cut off.
- Fixed bottom nav does not cover the final card; content padding includes nav height and safe-area inset.
- At widths <=380px, needs cards use one column to avoid cramped labels.
- Desktop layout retains existing global sidebar/navigation and feature routing.
- Existing engine and feature regression suites remain green.

## Scope boundaries
- No global navigation replacement.
- No feature deletion without source-level evidence that it is unused or broken.
- This patch is a responsive layout repair, not a claim that every feature has been redesigned from scratch.
- Visual verification on a physical Android device is still required after deployment; automated tests do not reproduce all browser UI chrome and font metrics.
