# Retainer Ledger

Record deposits and show what work used them. It is for consultants and
tradespeople who take deposits and need to show clients what remains.

Live product: <https://deposit-drawdown-ledger.sociobot.in>

Try the isolated sample first: <https://deposit-drawdown-ledger.sociobot.in/demo>.

## What it does

- Keeps requested deposits separate from money received.
- Records deposit requests, payments, drawdowns, and adjustments and shows the remaining deposit.
- Keeps corrections as dated adjustment records.
- Exports a timestamped one-page PDF statement and every activity row as CSV.
- Exports and imports JSON backups without replacing existing records.
- Keeps records in this browser after a reload and works offline after the first visit.
- Does not require an account or cloud sync. Ledger data stays on this device.
- Uses no analytics, trackers, CDN assets, or third-party runtime scripts.
- Includes one complete job free. A $29 one-time unlock enables unlimited jobs and custom statement branding.

This is a record-keeping utility. It is not accounting, tax, legal, or
revenue-recognition advice.

## Develop and verify

Requirements: Node.js 20+ and npm.

```sh
npm ci
npm run dev
```

Quality commands:

```sh
npm test          # calculation and PDF unit tests
npm run build     # production output in dist/
npm run test:e2e  # Chromium desktop + 390px mobile, claims, axe, PWA, exports
npm run test:claims # every public claim from /demo
npm run check     # all of the above
```

Playwright is pinned to `1.58.2`. Its Chromium browser must be available through the normal Playwright install or `PLAYWRIGHT_BROWSERS_PATH`.

## Build and deploy

The exact build command is `npm run build`. It produces `dist/index.html`, static
entries at `dist/demo/index.html`, `dist/privacy/index.html`, and
`dist/terms/index.html`, PWA assets, a service worker, sitemap, and 404 page.
Deploy the contents of `dist/` to any HTTPS static host. Do not configure
billing, DNS, or infrastructure from this repository.

Set `VITE_BILLING_BASE_URL` only when a non-production billing endpoint is required. The default is `https://api.sociobot.in`; factory staging can use `https://pilot-api.sociobot.in`.

## Data and privacy

Job data and optional branding stay in browser IndexedDB. The sample uses a
separate `demo:` database and never changes real data. The license token and its
daily verification verdict use localStorage. Only the token is sent to the
Sociobot verification endpoint. Users should keep a JSON backup before clearing
browser storage. If browser storage is damaged, the app offers a recovery-copy
download and an explicit local-data reset.

See the in-product `/privacy` and `/terms` pages. The demo design is documented
in [.factory/demo.md](.factory/demo.md). The claim inventory is in
[.factory/claims.json](.factory/claims.json). The design thesis and generated-image
provenance are in [.factory/design.md](.factory/design.md).

## License

MIT — see [LICENSE](LICENSE).
