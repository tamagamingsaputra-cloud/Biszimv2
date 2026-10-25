# PRD — BizSim v8.2.1 AI Comparison A

**Baseline:** BizSim v8.2.0 AI Comparison A; historical source family begins at v8.1.0.  
**Release goal:** repair structural UI defects visible in mobile screenshots, give product areas their own layout systems, ship local icons/illustration assets under the actual frontend publish root, and make creator production progression match simulation time.  
**Release type:** additive UI/application-shell and creator workflow release; not a rewrite of all game engines.

## 1. Product scope and non-goals
BizSim is a life and economic simulation game where the player manages time, needs, career, money, trading, long-term investments, businesses, staff, education, and optional content creation. All market and creator outcomes are simulated. This release does not introduce real exchange feeds, brokerage transactions, real social platform APIs, or guaranteed creator earnings.

Preserve existing global route IDs, login/session behavior, save compatibility, backend source-of-truth rules, business engine, simulation clock, payroll, market engine, career, life needs, education, investments, and creator data. Do not remove a functional legacy game system merely to simplify UI. Remove only redundant UI surfaces or unimplemented duplicate controls whose action does not change state.

## 2. Screenshot defects addressed
1. Dashboard profile name/avatar collided with the greeting/clock area because a generic global masthead was rendered above a second dashboard hero.
2. The same decorative command snapshot was injected on non-dashboard pages, creating repeated information and page crowding.
3. A floating simulate-day button overlapped mobile content and bottom navigation.
4. Stock order details used a scrolling modal layout that could push controls/transaction actions outside the visible area; a market order displayed an irrelevant limit-price input.
5. Trading CTA controls could compete with lower page content and bottom navigation.
6. Page layouts used the same card/grid structure too broadly.
7. Creator production timeline did not clearly communicate stage/action/time behavior to the user.

## 3. Global shell and navigation
- Desktop: persistent side navigation, compact page header, consistent account access.
- Mobile: compact topbar with no duplicated title/crumb wrapping; bottom navigation respects safe areas; body reserves room for navigation/action trays.
- Show only one profile representation per shell surface. The profile strip is rendered only on Dashboard.
- Remove `.fab` runtime insertion; keep the true simulation clock and controls inside the Dashboard/time module.
- Icons are local SVGs under `web/assets/uiux-v820/icons/` and must load within the published `web/` root; no runtime dependency on Canva URLs.
- Avoid horizontal overflow, overlapping profile labels, clipped names, and sticky/fixed actions that hide input fields.

## 4. Page-specific design system
Tokens are intentionally not a single repeated skin:
- Dashboard: neutral light canvas, navy identity strip, compact cards and needs panel.
- Asset Market / leveraged trading: dark navy terminal (`#061521`), deep teal panels, bright green positive state, red negative state, clear simulated-risk labeling.
- Investments / Portfolio: emerald accent for holdings and valuation; maintain distinction from short-term trading.
- Business / Operations / Suppliers: terracotta accent for catalog and operational decisions.
- Career & Jobs: indigo-violet professional job list and progression.
- Education: blue/teal learning-oriented surfaces.
- Profile: slate and restrained gold accent.
- Creator Studio: violet accent; production-stage colors retain semantic meaning.
Use SVG/vector icons, consistent sizes, accessible color contrast, responsive spacing and compact information hierarchy. No emoji icons, excessive decorative cards, glassmorphism, or cosmetic charts without data.

## 5. Stock market order sheet
- Header and footer remain fixed within the order sheet; only `.modal-body` scrolls independently.
- Height accounts for mobile dynamic viewport and safe-area insets.
- Market orders hide the limit-price field; limit orders show it and validate that the limit price is positive.
- Lot quantity must be positive. Estimation shows trade value and supported transaction fees; errors are visible before submission.
- Trading action tray is visible, respects mobile bottom-nav clearance, and becomes in-flow/sticky on desktop.
- Current market pricing stays sourced from game state; this release does not claim that mock chart styling represents live prices.

## 6. Content Creator Studio
### UI surfaces
Overview, My Channels/Accounts, Content Planner, Create Content, Production Queue, Published Content, Live Studio, Audience & Analytics, Monetization, Sponsorship/Collaboration, Equipment & Skills. The obsolete legacy tab is not exposed as a separate navigation destination. Keep platform capabilities distinct and limited to the currently supported engine model.

### Production flow
1. Draft the video and choose an allowed platform/content type, topic, production quality, duration and budget.
2. Starting production changes the item to `queued` and sets a `startedDay` ahead of the current simulation day.
3. One full simulated day is a wait day: 0% progress, no production cost, and no consumed active-production slot.
4. After the wait day, production becomes active; stage/progress/costs advance only when the simulation day/tick advances, not because the UI rerenders or wall-clock animation runs.
5. Stage order: Research → Script → Preparation → Recording → Editing → Review → Upload → Ready to Publish.
6. Every stage includes a semantic local/vector icon; Editing uses scissors and red progress fill; Upload uses upload-cloud and teal fill. Completed stages use a completed indicator; upcoming stages are muted; current stage is highlighted.
7. Longer content durations increase required production hours using the engine's duration factor; UI reports the selected duration, current stage, progress, estimated completion and spent budget from state.
8. Publish is unavailable until status is `ready`; cancel/draft/duplicate semantics remain governed by the existing creator engine.

## 7. Simulation integrity requirements
- Do not progress a production item through client-only animation or wall time.
- Do not charge production costs before the engine's actual production progress occurs.
- Queued wait-day items do not consume active production slots.
- Re-render and refresh must not double-advance progress or spend.
- A publish action is allowed only once an item is ready, and metrics/payout remain state/engine derived.
- Payroll and calendar regressions from the prior release remain in the full test gate.

## 8. Feature cleanup
- Removed generic all-page “current simulation” hero/snapshot from the application shell; actual Dashboard data remains.
- Removed the globally floating simulate-day action that duplicated the Dashboard clock controls and covered content.
- Removed exposed legacy Creator tab references so the current Creator Studio areas define the navigation.
- Do not remove core Business, Career, Market, Investments, Education, Calendar, Life, or Creator engines because those remain core product scope.
- Historical release documents are archived, not removed from source control.

## 9. Runtime assets and deploy
- Local assets: `web/assets/uiux-v820/icons/*.svg`, `sprite.svg`, `web/assets/uiux-v820/illustrations/market-terminal.svg`.
- CSS override: `web/v820-layout-fixes.css`, loaded after the prior theme layers in `web/index.html`.
- Vercel `outputDirectory` and Netlify `publish` are both `web`; assets must live under `web/` for deployed URLs.
- Canva spec is a design reference: https://canva.link/3p59szvmyxt8z10 (overall UI board); https://canva.link/c8xhn3e6e8l52op (Creator production workflow). Runtime icons/illustration are local SVG source files, not remote Canva image URLs.

## 10. Acceptance criteria
- Dashboard has no duplicate global hero/profile content and no floating simulate control covering the UI.
- Long player names wrap without clipping; dashboard time/needs area is responsive.
- Bottom navigation and trading CTA tray don't cover page content; safe-area padding is present.
- Market page and stock modal use the dark terminal theme.
- Market order hides limit price; limit order exposes and validates it.
- Modal body scrolls independently while footer actions remain reachable.
- Creator start creates queued status and progress/spent remain unchanged through one full simulation day.
- Production progress begins only after the wait day, uses duration-based work estimates, shows distinct stage icons/colors, and is engine-driven.
- Creator cannot publish before ready.
- Full automated suite passes.

## 11. Known limitations
- Visual tests against physical Android hardware and the user's Vercel deployment were not run from this build environment.
- Some platform-specific social features (for example, full Twitch capabilities) remain limited by the current simulation engine.
- External font dependency warning for `web/engine/api.js` remains non-fatal; root package type must not be globally changed because the Node server uses CommonJS.
- The app code and local assets are packaged; the user must deploy this archive or its contents to a separate Vercel preview to see these changes on the website. No deployment was performed here.

## 15. Post-audit UI cleanup
- Route titles must be defined for extended routes that are not listed in the legacy top-level navigation array, so the header must not fall back to the generic “BizSim” title.
- Application brand mark uses the dedicated local BizSim SVG, not a generic chart icon.
- Legacy v6 investment subtotal is not rendered beside the newer investment allocation because it duplicates and may confuse portfolio values. Legacy investment records and engine compatibility remain intact.
- The emerald Investments skin must apply to the actual `invest` route as well as `investments`/`portfolio`.

## 16. Dashboard structural duplicate removal (v8.2.1)
- The Dashboard must be composed from one profile strip, one simulation clock/needs workspace, the real life summary, and state-backed investment/business/activity sections.
- Do not append the legacy `dash2()` dashboard beneath the v740 clock module. That renderer added an old “Good morning” page head, duplicate KPI cards, and a decorative fixed-path financial graph; these duplicated information and caused the profile/time modules to visually collide on mobile.
- The new-player empty state remains when the engine indicates there is no career, business, investment, debt or positive cash. Core simulation, career, business, investment and Creator systems are not deleted.
- Dashboard Flexbox ordering must preserve DOM order: profile → time/needs/quick actions/life summary → status and data-backed panels.
