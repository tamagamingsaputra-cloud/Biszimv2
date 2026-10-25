# Runtime UI Asset Manifest — BizSim v8.2.1

These are real local runtime assets packaged with the source. Do not rely on Canva URLs as runtime dependencies.

## Local SVG assets
Published path: `web/assets/uiux-v820/`

### Icons — `web/assets/uiux-v820/icons/`
- `sprite.svg`: symbol sprite loaded by `App.v820Icon()`; referenced from `web/v730-shell.js` and wired into `App.icon()` / navigation. Contains the symbols from every standalone icon listed below.
- `dashboard.svg`: Dashboard identity.
- `market.svg`: Asset Market / trading.
- `investments.svg`: long-term Investments.
- `business.svg`: business catalog/operations.
- `career.svg`: Career & Jobs.
- `education.svg`, `learn.svg`: education and learning.
- `profile.svg`: player profile.
- `people.svg`: employees/team.
- `wallet.svg`: finance/cash.
- `calendar.svg`: calendar/tasks.
- `creator.svg`: Content Creator Studio.
- `notifications.svg`: alerts/notifications.
- `brand.svg`: BizSim brand mark.
- `suppliers.svg`: supplier/logistics.
- `events.svg`, `news.svg`, `gavel.svg`: event, news and decision workflows.
- `land.svg`, `bank.svg`, `coins.svg`: property, bank and finance menu actions.
- `tool.svg`: operations/tools.
- `grid.svg`: app menu.
- `menu.svg`, `close.svg`, `arrow.svg`, `refresh.svg`, `settings.svg`, `shield.svg`: navigation and utility actions.

### Illustration
- `web/assets/uiux-v820/illustrations/market-terminal.svg`: locally bundled terminal/chart decoration used by the Asset Market page header CSS.

## Canva references
- Overall design board: https://canva.link/3p59szvmyxt8z10
- Creator production progress board: https://canva.link/c8xhn3e6e8l52op

The Canva designs are editable design references. The SVGs listed above are packaged in the game source and do not load from Canva. They are native/local vector assets created/curated for this interface, rather than exported flattened screenshots of the Canva pages; no full Canva page image is used as the interactive interface.

## Publish path check
Vercel `outputDirectory` and Netlify `publish` are both `web`, so any runtime image referenced by page CSS/HTML must live below `web/`. Tests verify essential icons and sprite exist under this published root.
