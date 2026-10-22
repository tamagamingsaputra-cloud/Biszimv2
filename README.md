# BizSim 6.1.1 — Bug Update

BizSim 6.1.1 is an **incremental bug-fix release** based on the original BizSim 6.0/v5.5.5 source. The existing UI, navigation, pages and simulation structure are preserved. This release does not replace the project with a new UI architecture.

## What changed
- Fixed the production authentication/deployment path for Netlify.
- Added a same-origin Netlify Function backend at `/api/*`.
- Added persistent Netlify Blobs storage for Netlify production.
- Removed frontend backend-URL/API-key configuration and related messages.
- Preserved the original BizSim visual language and page structure.
- Fixed compatibility for the original business incident, investor offer, loan and market transaction requests.
- Fixed the mobile navigation trigger while keeping the existing visual system.
- No phone emoji or emoji-based navigation was added.

## Local development

Requires Node.js 22+.

```bash
npm install
npm start
```

Open `http://localhost:8787`.

Local development continues to use the existing Node + SQLite server. Netlify production uses the included Netlify Function and Netlify Blobs.

## Netlify deployment

Use the **project root** `BizSim-v6.1.1` when deploying. Netlify should:

- publish `web/`
- deploy functions from `netlify/functions/`
- use Node.js 22.12+

No `BIZSIM_API_BASE`, frontend backend URL, API key, or secret needs to be placed in the frontend.

## Verification

The release was checked with:

- JavaScript syntax checks for frontend, local server, database module and Netlify Function.
- Local authentication smoke test: register → session → `/api/me` → jobs → simulate day → logout → session revocation.
- Netlify Function compatibility test using an isolated storage mock: register, `/api/me`, business creation, business incident, incident decision, investor offer, loan compatibility, BUY, SELL and logout.
- Rendered frontend source scan for the removed backend/API-key messages and phone-emoji navigation.

The original source files were retained unless a change was required for the bug fix or deployment compatibility.
