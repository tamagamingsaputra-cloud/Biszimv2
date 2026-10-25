# BizSim v8.1.0 — PRD & Implementation Handoff

## Baseline
- Baseline source: BizSim v8.0.0 AI Comparison A.
- Deployment project must remain separate from the Claude comparison build.
- Global navigation, career, business, market, investment, education, clock and persistence engines are retained.

## Implemented changes
1. Creator production progress advances only through simulation day ticks; starting a production job records `startedDay`. No progress or production expense is charged on the same simulation day.
2. `uploading` is a real engine status between review and ready; it remains an active status in subsequent daily ticks.
3. Duration is stored as `durationSec`; valid video durations are 5 seconds to 30 minutes. Duration scales production hours with a square-root factor, clamped to 0.25–4x the format baseline. Non-video formats do not use duration.
4. Production queue renders stage icons and status-specific progress colors: editing red, upload teal, review amber, ready green. The horizontal stage strip scrolls on narrow mobile screens rather than forcing page width.
5. The redundant “Fitur Lama” tab was removed from Creator Studio. The current modular Creator Studio is the primary path; unrelated career/business/education systems were not deleted.
6. Production UI displays the wait-until-next-simulation-day rule, stage description, progress, estimate, and spent/budget.

## Production stage mapping
- 0–10%: research
- 10–22%: scripting
- 22–32%: preparation
- 32–55%: recording
- 55–82%: editing
- 82–92%: review
- 92–100%: uploading
- 100%: ready to publish

The percentage comes from completed production hours divided by engine-calculated total hours. It is not a decorative timer.

## UI/assets
- Creator stage icons use the existing vector icon system. Existing SVG asset files remain inside `assets/uiux-v800/` and are bundled with the project.
- Creator production styling is in `web/v780-creator-studio.css`; no remote image dependency was added for stage icons.
- Canva design is a design reference, not a runtime dependency. The runtime implementation is in source files.

## Test status
- `npm run test:all`: passed on Node.js v22.16.0 using isolated smoke-test port `19880`.
- Creator tests now assert no progress/cost before a day tick, editing/uploading stages, duration-dependent production time, invalid duration rejection, and existing creator regressions.
- Existing test suite reports a Node module-type warning for `web/engine/api.js`; it did not fail the suite.
- No physical Android-device screenshot test was performed.

## Remaining limitations
- Video duration options are preset values, not arbitrary free-form duration.
- Stage timing is modeled as portions of total production work, not a real video encoder/upload bandwidth model.
- “Hapus fitur lama” here removes the redundant Creator Studio legacy tab only. Other old systems are preserved unless separately audited and proven unused.

## Next steps
1. Deploy this package to a separate preview URL from Claude’s build.
2. Validate mobile layout on Android, especially the stage strip and queue buttons.
3. Compare creator day-tick timing against the live deployed simulation clock.
4. Continue a source-level audit before deleting any other legacy system.
