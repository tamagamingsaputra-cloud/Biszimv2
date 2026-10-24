# PRD — BizSim Content Creator Studio v7.8.0

## Status
- Project variant: AI Comparison A (isolated folder; do not overwrite AI Comparison B or the previous baseline).
- Source baseline: BizSim v7.7.0 AI Comparison A.
- Current package: BizSim v7.8.0.
- Scope of this update: Creator Studio page-specific visual system, responsive layout, documentation, and regression validation. The creator simulation engine already existed in baseline v7.7.0; this update does not claim to have newly implemented every capability in the product brief.

## Product goal
Offer an optional creator-career path that can run alongside a regular job. Players create content for platform-specific accounts, spend time and money on production, publish work, develop audiences, run live sessions, receive eligible simulated support, review analytics, accept sponsorship offers, improve equipment/skills, and receive creator payouts under simulated rules.

## User segments and needs
- New creator: create first account, understand prerequisites, see useful empty states, avoid accidental spending.
- Active creator: schedule/prioritize production, monitor costs and progress, publish only ready content.
- Monetized creator: distinguish estimated/pending revenue from paid cash, fees, taxes and expenses.
- Multi-platform creator: compare metrics only with platform context and supported capabilities.

## Information architecture
1. Overview
2. Accounts & Channels
3. Content Planner
4. Create Content
5. Production Queue
6. Published Content
7. Live Studio
8. Analytics
9. Monetization
10. Sponsorships
11. Skills & Equipment
12. Legacy creator features (compatibility surface)

## Platform capability matrix (baseline engine)
| Platform | Content formats in baseline | Platform-specific metrics | Simulated support | Status |
|---|---|---|---|---|
| YouTube | Long video, Shorts, Community post | Views, watch time, average duration, retention, subscribers gained | Super Chat/Stickers in live, ads and memberships after simulated eligibility | Enabled |
| TikTok | Short video, photo carousel, story | Video views, completion, average watch time, shares, followers gained | LIVE gifts after simulated eligibility | Enabled |
| Instagram | Feed photo, carousel, Reels, story | Reach, impressions, likes, saves, shares, profile visits | Gifts/memberships when enabled by the simulation rules | Enabled |
| Twitch | Capability slot only; no content types configured | None until configured | None until configured | Disabled / extension point |

Platform rules are game simulation rules, not representations of current official platform policies. Never enable unsupported formats merely to make screens look consistent.

## Core user flows
### Account creation
Choose an enabled platform, enter a unique handle, and persist account state. Duplicate account creation and disabled platforms are rejected.

### Content production
Choose platform → supported format → topic → title/caption → quality → budget → save draft or start production. State is persisted by the engine. Progress, time estimate, and spend are driven by simulation ticks, skill, equipment, available time, format, topic and quality. Players can start drafts, reprioritize queue items, duplicate, cancel, publish ready content, or schedule publication.

### Publishing and analytics
Publishing requires `ready` state. Published outcomes are stored and platform metrics differ by platform. Charts must use saved historical data; new accounts show empty states rather than invented history.

### Live streaming
Choose an enabled account, topic, quality, title and planned duration; one live may run at a time and per-platform daily limits apply. Simulation ticks update concurrent/peak viewers, unique audience, chat activity, followers, gifts where eligible, costs and the final report. Ending a live records a report and clears active live state.

### Monetization and payout
Each platform has its own simulated eligibility. Gross, fees, expenses, taxes, pending creator balance and paid cash are displayed separately. Payouts follow the simulation's minimum threshold and schedule; pending creator revenue is not immediately treated as cash.

### Sponsorship
Offers appear only when simulated eligibility is met. Accept/reject actions update state; accepted obligations have deadlines and reputation consequences.

### Skills and equipment
Creator skills improve through supported activity; equipment upgrades cost personal cash and influence production/live outcomes. Creator career is optional and does not replace the player's main job.

## UX / visual system
- Preserve global BizSim navigation and the overall navy/white brand foundation.
- Give Creator Studio a distinct violet/coral/teal accent system and workspace hierarchy, not a universal layout copied across all pages.
- Platform identity cues: YouTube red, TikTok charcoal/cyan, Instagram violet/orange; never imply these are official integrations.
- Overview emphasizes aggregate followers, 7-day follower change, creator net earnings, production costs, active queue, schedule/alerts, and platform accounts.
- Trading/investments/business/career pages retain their own information architecture.
- Responsive design: horizontal scrollable creator tabs, compact two-column KPI layout on mobile where readable, full-width controls on narrow screens, accessible focus states and reduced-motion support.
- No emoji icons; use existing SVG/icon helpers.

## Data and architecture constraints
- UI uses `/api/v731/creator/*` and state from `v731.creator`.
- Creator engine is in `netlify/functions/v731-creator.mjs`, uses day hooks from the existing simulation engine, and persists state through existing save/hydration flow.
- UI presentation lives in `web/v730-creator2.js`; Creator Studio styling is scoped in `web/v731-creator.css` plus new `web/v780-creator-studio.css`.
- Do not generate random metrics in render. Simulation PRNG and engine state are authoritative.
- Do not rewrite global navigation, career engine, cash ledger, simulation clock, business engine or other legacy modules to style this feature.

## Acceptance criteria
1. Unsupported platform/format combinations are rejected by the engine.
2. Duplicate accounts are rejected and account state survives reload.
3. Production cost is deducted incrementally from state, progress advances on simulation ticks, and publishing before ready is rejected.
4. Queue capacity, priority, duplicate and cancel rules are enforced.
5. Published metrics and analytics are persisted and platform-specific.
6. Live cannot start without an account, cannot overlap another live, obeys duration and per-day limits, and reports its final results.
7. Gifts remain locked until eligibility and net amount equals gross minus platform fee.
8. Payout is not immediate; it follows schedule/minimum threshold and separates cash paid from pending creator revenue.
9. Sponsorship offers/obligations obey simulated requirements and deadlines.
10. Mobile/desktop layout retains keyboard focus visibility and uses empty states when no account/history exists.
11. Regression suite for career, business, market, calendar/clock, education and session behavior passes.

## Known gaps / not claimed complete
- No real third-party platform integration; all activity is simulated.
- Twitch remains disabled until a full capability configuration is authored and tested.
- Premiere, full community image attachments, Instagram subscriptions/affiliate, brand merchandise and all future platform features are not assumed available unless represented by the engine.
- Visual/browser testing on physical Android and desktop browsers has not been performed as part of this automated test run.
- Previously reported issue: default daily salary appearing while unemployed, and full calendar advancement validation, are separate open audit items unless verified and fixed in a dedicated patch. This package does not claim those issues are resolved.

## Next steps
1. Perform browser-level visual checks at 360px, 390px, 768px, 1280px and 1440px widths.
2. Implement/verify the still-missing format capabilities only after adding data models, state transitions and tests.
3. Continue the salary/clock audit separately; test unemployed, employed job-specific payroll, no duplicate payout, reload and month/year boundaries.
4. Keep AI Comparison A isolated from AI Comparison B and compare both against this PRD and the same test scenarios.
