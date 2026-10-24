# Product Requirements Document (PRD) — BizSim Previous Baseline

**Source baseline:** `BizSim-v7.6.1-Layout.zip` (built on the BizSim v7.5.0 source family).  
**Purpose:** consolidate the implemented product scope, user-facing behavior, data ownership, constraints, and known gaps visible in the prior project and its documentation. This document describes the baseline; it does not imply that every historical roadmap item is fully implemented.

## 1. Product summary
BizSim is an Indonesian-themed economic life and business simulation. The player starts with Rp0 personal cash, develops skills and career income, manages personal needs and time, acquires financial and real assets, opens and operates businesses, hires employees, manages risks, and optionally develops creator-platform income. Simulation state is authoritative in the backend for the primary game and is persisted across sessions. Asset prices, events, economic conditions, and business outcomes are simulated; they are not live financial-market data or financial advice.

## 2. Product goals
1. Give players a viable route from zero starting cash to earned income.
2. Make consequential decisions visible: cash, salary, liabilities, asset value, operating costs, risks, and deadlines.
3. Keep related features on a consistent simulation state rather than disconnected UI-only counters.
4. Support both desktop and mobile, including mobile bottom navigation and responsive pages.
5. Keep existing accounts/save data and legacy features compatible across additive releases.
6. Clearly distinguish realized values, estimates, and simulated market values.

## 3. Target users and primary journeys
- **New player:** register → start with Rp0 → inspect Career & Jobs → apply for an eligible job or train/study → earn income → build savings.
- **Employee:** manage work schedule, skill progression, attendance, salary and personal needs.
- **Investor/trader:** inspect simulated market history and positions → review fees and available cash → buy/sell → see holdings and realized/unrealized results.
- **Entrepreneur:** browse catalog → review startup cost, fixed costs, skill requirements and risks → confirm opening → manage business operations, staff, stock and expansion.
- **Long-term investor:** choose an asset category → inspect its specific cash-flow, risk, liquidity and holding period → manage position and valuation.
- **Creator:** select supported platform → plan and publish content → grow followers/views → earn optional side income without replacing a main career.

## 4. Global information architecture
Global routes visible in the baseline include Dashboard, Career & Jobs, Business, Operations & Risk, Finance, Asset Market, Portfolio, Employees & Customers, Suppliers, Events & Decisions, Calendar & Tasks, and Profile. Other modules add Investments, Creator Studio, Education, Shop, and related life-simulation actions through extension scripts. The prior update explicitly preserves global route IDs and navigation. Desktop uses a left sidebar and top bar; mobile uses an off-canvas sidebar plus bottom navigation.

### Navigation requirements
- Active route must be visually clear.
- Mobile menu must be keyboard accessible and dismiss when a route is selected.
- Primary tasks must not require returning to Dashboard unnecessarily.
- Do not rename route IDs or remove a route without a migration and explicit scope decision.

## 5. Dashboard requirements
### Purpose
A decision hub, not a decorative landing page. Prioritize the player's current financial state, urgent issues, next best actions and recent activity.

### Data to show when available
- Personal cash and monthly salary; do not label monthly salary as daily income.
- Business value/cash, total assets, debt and net worth where those values can be derived from authoritative state.
- Reputation, credit score, career status and simulation day/date.
- Active incidents, pending investor offers, active work/study, and recent transactions/activity.
- Short history graph only when backed by stored history; never draw a plausible-looking chart from a fixed array.

### Empty states
- No business: explain that no business is owned and provide a route to the catalog.
- No investment/transaction: explain that no position exists and provide the relevant market or investment link.
- No job: show an eligible income route and career actions.
- Missing history: show “data belum tersedia” rather than invented progress.

## 6. Career & Jobs requirements
- Display real job catalog entries from the engine: title, company, industry, salary, education, minimum skill and any available experience/shift/competition metadata.
- Support job detail before applying, application submission, skill/interview evaluation where implemented, application status/history, active job and salary/experience progression.
- Acceptance must be determined by engine evaluation; UI estimates must be labeled estimates, not guarantees.
- A player with Rp0 must have a realistic route to apply for at least some entry-level work or improve eligibility.
- YouTube/creator activity is optional side income, not an ordinary business catalog item.
- Baseline limitation: some job descriptions state that detailed work hours are not modeled independently. Do not imply unsupported schedules.

## 7. Business catalog and operations requirements
### Catalog
- Catalog contents and count must come from `App.businessCatalog`/the engine; baseline end-to-end tests report 15 business types after extras merge.
- Each entry should use its matching illustration and show category, description, startup capital, fixed monthly cost, working-capital estimate, skill requirement, capacity, initial quality, complexity and current eligibility.
- Detail modal must explain unmet requirements (cash or skill), risks and initial parameters. It must not promise profit.
- Business creation must submit to the real `/api/businesses` handler; disable duplicate submissions while processing and show server errors accurately.
- Location options should be described as game-supported options; the previous catalog UI offers a small fixed set of Indonesian cities, so it must not claim unrestricted real-world geolocation.

### Operations after opening
The broader product model includes sales, prices, product demand, stock, suppliers, staff, marketing, expenses, incidents, insurance, upgrades, branches and expansion where supported by the active engine. The UI must not expose controls that only display success toasts without changing state.

### Risks and economics
Business results depend on simulated sales, price, demand, cost of goods, fixed expenses, capacity, stock, quality and incidents. Show assumptions and observed history; never guarantee profit. The baseline catalog modal explicitly says its startup parameters are not a profit forecast.

## 8. Asset Market / simulated trading requirements
- All prices must be labeled **SIMULATED** and sourced from simulation state, not real-time exchange feeds.
- Asset Market is short/active trading; it is separate from long-term Investments.
- Supported baseline assets include BTC, BBCA and TLKM in the market path; additional markets exist in extended investment modules.
- Trading UI should show current price, movement, available cash, quantity, fee, average cost, position value, realized P/L and unrealized P/L where the engine provides the fields.
- BUY and SELL must call transaction endpoints; insufficient funds and insufficient holdings must be rejected by the engine.
- Profit and loss need distinct labels and signs. A successful order should refresh state from the server.
- A price chart must plot actual persisted history. Do not display a chart made from a static illustrative array as if it were market history.
- Deterministic price changes should derive from stored simulation state/seed so test runs are reproducible.
- Baseline gap: market history has numeric samples but lacks a timestamp per sample, so it cannot truthfully support intraday/1D/7D/30D selectors. Simulated volume is not in market state. These values must not be fabricated.

## 9. Investments (long-term) requirements
The broader v7.0 investment model documents eight distinct asset classes: shares, trading, bonds, mutual funds, gold, property, deposits and collectibles. Later versions also add land and economic-event effects. The intended long-term Investments page is separate from Asset Market and should use category-specific behavior rather than make every asset move like cryptocurrency.

- **Shares/index funds:** valuation follows company/market factors; dividends, fees and settlement are shown if supported.
- **Gold:** simulated price is affected by demand, inflation and sentiment; buy/sell spread and storage/transaction costs should be explicit where supported.
- **Land/property:** location, legal/ownership costs, rental income, vacancy, maintenance, selling delay and liquidity matter.
- **Bonds:** coupon, maturity, interest-rate sensitivity and default risk are shown if implemented.
- **Deposits:** tenor, interest, early withdrawal penalty and renewal behavior are shown if implemented.
- **Collectibles:** appraisal/auction/liquidity and authenticity risk apply if implemented.

Each position should expose buy cost, units, current estimated value, valuation change, fees, cash flow/income, risk and intended horizon. Estimated valuation must be separated from realized sale proceeds. Returns are uncertain; no guaranteed-profit copy.

### Baseline gap
The baseline investment config sets `returnRange` to `[0,0]` for at least one path. Therefore, the UI must not imply that category-specific active valuation movement exists until the engine supports it. Historical release notes describe richer features, but those claims must be checked against the actual current engine before being surfaced as available.

## 10. Portfolio / Finance requirements
- Present cash, business valuation, debt, asset values and net worth with clear formula/source labels.
- Separate cash flow from asset valuation and realized trading results.
- Transaction history should use actual recorded transactions.
- Risk summaries should be derived from holdings, leverage, concentration, liquidity and debt where those data exist.
- A chart or metric with no underlying time series must be omitted or labeled unavailable, not generated from static bar heights.

## 11. Character life and simulation clock
The v7.4 clock model documents a 12-month × 30-day calendar, no leap year, and simulation time at 1x/2x/4x or pause. One real second maps to one simulated minute at 1x; synchronization is server-backed and time does not advance offline when the tab is inactive.

Character needs include hunger, thirst, energy, hygiene, health, mood, stress and bladder. Needs affect work performance, salary deductions, sleep/fainting and medical costs. Actions such as food, sleep/rest, delivery and transport consume time and/or money and should report why an action is unavailable. Daily simulation may use an autopilot routine when the player advances a full day without interacting.

## 12. Education and training
The v7.5 education module documents SD, SMP, SMA/SMK, D3 and S1 pathways; course/program catalog, requirements, fees, timetable, attendance, tasks, exams, results, remedial work, certificates and graduation records. SMK can award a competency certificate. Education schedules interact with the simulation clock and work attendance.

Requirements: costs and progress must come from engine state; exam answers/keys must not leak before submission; attendance, timeouts and fee arrears must affect eligibility according to server rules. The prior tests cover course enrollment, work-class attendance, exams, remedial, graduation and employment education requirements.

## 13. Employees, customers and suppliers
The v7.0/v7.2 design describes recruiting, candidate profiles, interviews, offers, salary negotiation, morale, productivity, loyalty, promotion, raises, dismissal and severance. Supplier behavior is intended to affect price, quality, reliability and delivery. These pages must show only state-backed candidates, employees, supplier offers and operations. Avoid hardcoded employee satisfaction/quality percentages when the engine does not calculate them.

## 14. Events, news, incidents and decisions
The simulation includes probability-driven incidents and events, including supplier delays, customer demand changes, theft, fire, flood, outage, negative reviews, inspections, price changes, economic/company news and other scenarios. Events should have recorded decisions and consequences, cooldowns and causal links where implemented.

- Show active incidents and event history from state.
- Decisions should call a real engine/API action and update state.
- A generic “Run Event” action must not fabricate arbitrary outcomes outside the configured event engine.
- News and asset effects are simulation-only, not claims about current real-world events.

## 15. Creator Studio / YouTube side income
Creator features include YouTube and other supported platforms, content types, production tools, followers/views, streaks, sponsorship opportunities and monetization. Publishing should follow a real content queue/progress workflow; the player can develop creator income alongside a main job. Creator metrics must come from state and not be substituted by hardcoded followers or earnings.

## 16. UI/UX and accessibility requirements
- Desktop: persistent navigation, clear page title/context, useful content width and consistent spacing.
- Mobile: single-column fallbacks, accessible navigation drawer, bottom navigation, tappable controls and no horizontal overflow.
- Page-specific information hierarchy: dashboard as command center; market as trading terminal; investments as portfolio/category workspace; business as catalog-to-operations workflow; career as current status plus job opportunities.
- Use relevant SVG/illustrations, not random duplicate images or emoji substitutes for icons.
- Use visible keyboard focus, semantic buttons/labels, reduced-motion support and clear loading/empty/error/success states.
- Avoid nested-card overload and decorative charts that imply real data.
- Avoid external font dependencies where a system font stack is sufficient; the app should remain usable offline.

## 17. Data, persistence and backend architecture
- Primary app: browser UI in `web/`, local Node server in `server/`, Netlify Functions in `netlify/functions/`, and SQLite local database in `data/bizsim.sqlite`; Netlify uses same-origin `/api/*` and Blobs persistence as documented in prior release notes.
- `web/engine/` contains local engine copies. When updating engine logic in Netlify Functions, use `npm run sync:local` when applicable so local and deployed behavior do not drift.
- Authentication uses username/email-style identity and password; session is represented with an HttpOnly cookie in the prior bug-fix docs. Never put backend secrets in frontend files.
- Preserve save compatibility and add migration logic when changing persisted structures.

## 18. Reliability and error handling
- UI actions must disable or guard against duplicate submission while in flight.
- Parse API errors defensively and show actionable messages.
- Boot failure should show diagnostic text rather than a blank screen.
- Local/server and deployed function paths must remain compatible.
- Do not report success until the server confirms the operation.

## 19. Acceptance criteria
1. New account starts with the documented Rp0 state; no fake starting balance.
2. At least one realistic path to income is available from the starting state.
3. Business creation validates actual cash and skill on the server and records the created business.
4. Trading buy/sell changes holdings and records fees/realized P/L; rejected trades leave balances unchanged.
5. Asset Market is visibly marked simulated and never presented as real exchange data.
6. Long-term investments remain distinct from active trading and do not promise returns.
7. Career applications record status and use engine evaluation.
8. Creator content moves through the real queue/progress/publish flow.
9. Calendar and activity surfaces only show actual state-backed records; otherwise show a truthful empty state.
10. Desktop and mobile layouts have no horizontal overflow and controls remain operable.
11. Existing routes, save data and legacy education/creator/life features continue to pass regression tests.
12. All automated checks pass; visual browser/device validation is separately reported.

## 20. Test strategy and baseline status
The previous package provides `npm run test:all`, aggregating syntax checks, clock tests, creator tests, engine end-to-end tests, education tests and HTTP smoke tests. The prior baseline run passed those tests. This does not establish complete visual correctness across all browsers/devices. The v7.7.0 comparison variant must rerun the same suite and report any failures.

## 21. Known gaps / items not to fake
- Timestamped market history and honest intraday/1D/7D/30D ranges are not complete.
- Market volume is not present in state.
- Some investment categories do not have active valuation movement in the current engine.
- Daily income cannot be shown as realized if only monthly salary is available.
- Some legacy pages still contain placeholder/sample values and toast-only actions; these must be audited page by page before claiming full functionality.
- Browser visual testing on actual Android/iOS devices is not covered by the current automated suite.
- The exact currently available catalog/features must always be verified against source and engine, not solely historical release notes.

## 22. Out of scope unless explicitly implemented
- Real brokerage integration or live exchange quotes.
- Guaranteed returns or investment advice.
- Real-world geolocation for business location unless a supported location service is connected.
- Unbacked performance charts, fictional progress, fake upcoming calendar events, fake buttons, or success toasts without state changes.
