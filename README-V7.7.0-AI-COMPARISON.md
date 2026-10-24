# BizSim v7.7.0 — AI Comparison Variant A

This is a separate comparison branch copied from the previous `BizSim-v7.6.1-Layout` package. It does not overwrite that folder or the original v7.5.0 upload.

## Purpose
- Provide a visibly different page layout for a fair side-by-side comparison between two AI implementations.
- Keep global route IDs and existing simulation engines intact.
- Remove remote font dependencies so typography does not change with network availability.
- Stop Calendar & Tasks from showing fabricated upcoming events or toast-only task actions; it now reads the actual task list in `state.v730.tasks` and shows an honest empty state if none exists.
- Add page-specific responsive information architecture for Dashboard, Asset Market, Investments/Portfolio, Business, and Career & Jobs.

## Main changes
- Added `web/v770-comparison.css`.
- Updated `web/index.html` metadata, loading text, stylesheet list, and removed external Typekit stylesheet requests.
- Updated `web/v760-ui.js` branding to `v7.7.0 · A` rather than incorrectly showing v7.5.0.
- Replaced fake Calendar task creation/open buttons and hardcoded future agenda with actual `v730.tasks` state and summary.
- Added `docs/PRD_BIZSIM_PREVIOUS_BASELINE.md` as a consolidated product requirements document reconstructed from the previous source and its release documentation.

## Run locally
Requires Node.js 22.12+; run `npm install`, then `npm start`, and open `http://localhost:8787`.

## Validation
Run `npm run test:all`. This checks syntax, clock, creator, engine end-to-end, education, and HTTP smoke tests. Browser-based visual regression across real devices is not included in this package's automated suite.

## Comparison discipline
Treat this as Variant A. Keep the other AI's output in a separate root folder, use the same test scenarios and viewport sizes, and compare screenshots plus behavior—not file size or the number of CSS rules.
