# BizSim v8.2.1 — AI Comparison A

This is the isolated **Comparison A** project, prepared for side-by-side evaluation against a separate AI build. Immediate source baseline: BizSim v8.2.0 AI Comparison A, built on the v8.1.0 source family; it preserves the existing business, simulation, career, investment, market, life, education, and creator engines while applying targeted UI/runtime repairs.

## Main changes in v8.2.1
- Replaced the global repeated hero/snapshot with a compact Dashboard-only profile strip; other pages keep their own content hierarchy.
- Rebuilt the application shell and navigation icon usage around local SVG assets under `web/assets/uiux-v820/`.
- Removed the obsolete floating simulation control that overlapped content and bottom navigation; the simulation clock remains in the dashboard's real clock component.
- Applied page-specific layout and color tokens: dark navy trading terminal, emerald investment/portfolio, terracotta business, indigo career, blue education, gold profile, violet creator studio.
- Fixed the stock detail/order sheet to keep its header/footer visible while the body scrolls; market orders hide the limit-price field.
- Made trading order actions sit in a fixed safe-area-aware tray on mobile and sticky in desktop layout.
- Creator production uses state-driven steps and icons, red scissors editing progress and teal upload progress. Starting production spends one full simulation day at 0% progress/0 cost; work begins after that wait day. Video duration scales the required production time.
- Removed legacy Creator tab references and corrected smoke tests to select an available port automatically.

- v8.2.1 removes the legacy Dashboard body that was being appended underneath the newer clock/needs module; the duplicate greeting/KPI stack and decorative static chart no longer render. The single active dashboard keeps state-backed life summary, level/date/debt, investments, businesses and recent activity.

## Run locally
Requires Node.js >=22.12.

```sh
npm install
npm start
```

Open `http://localhost:8787` (unless `PORT` is configured differently). The deployment config publishes `web/` as the frontend. Netlify functions are in `netlify/functions/`.

## Test

```sh
npm run test:all
```

The complete test suite passed on Node.js v22.16.0 in the authoring environment after the free-port smoke-test fix. Details: `docs/releases/v8.2.1/BizSim-Test-Report-v8.2.1.md`.

## Release documents
- `docs/releases/v8.2.1/PRD-BizSim-v8.2.1.md`
- `docs/releases/v8.2.1/BizSim-Chat-Handoff-v8.2.1.md`
- `docs/releases/v8.2.1/BizSim-Changelog-v8.2.1.md`
- `docs/releases/v8.2.1/BizSim-Test-Report-v8.2.1.md`
- Historical release notes are retained under `docs/archive/` for traceability; they are not the current version's instructions.

## Important verification boundary
Automated tests and source-structure tests passed. Chromium headless attempts were blocked by environment policy for localhost and file URLs, so this release does **not** claim visual certification on a physical Android device, desktop browser, or the user's current Vercel production deployment. The provided screenshot showed the old `bizsim-v7.vercel.app` deployment; this archive must be deployed to a separate preview/project before its changed shell and CSS will be visible there. No production deployment was performed by this package operation.
