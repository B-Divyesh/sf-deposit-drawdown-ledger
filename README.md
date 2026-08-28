# Retainer Ledger

Retainer Ledger is a local-first PWA for independent consultants and tradespeople who take a deposit or retainer and need to show a client exactly how approved work draws it down. It keeps formal deposit requests separate from money actually received, preserves every correction as a dated adjustment, and produces a client-ready one-page PDF statement.

Live product: <https://deposit-drawdown-ledger.sociobot.in>

## What v1 does

- Creates job ledgers with a deposit request, client, reference, date, and currency.
- Records received payments, additional requests, approved drawdowns, and signed adjustments.
- Calculates requested, received, drawn-down, adjusted, and remaining totals without treating a request as money held.
- Keeps the activity trail append-only; corrections are new adjustment records.
- Downloads a timestamped one-page PDF statement and a complete CSV.
- Exports and merges versioned JSON backups so users can move or restore local data.
- Installs as an offline PWA and stores records in IndexedDB without an account or sync service.
- Provides one complete job free. A $29 one-time Sociobot license unlocks unlimited jobs and custom PDF branding; core export and accessibility features stay free.

This is a record-keeping utility, not accounting, tax, legal, or automatic revenue-recognition software. It does not collect card payments.

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
npm run test:e2e  # Chromium desktop + 390px mobile, axe, persistence, PDF, offline
npm run check     # all of the above
```

Playwright is pinned to `1.58.2`. Its Chromium browser must be available through the normal Playwright install or `PLAYWRIGHT_BROWSERS_PATH`.

## Build and deploy

The exact build command is `npm run build`. It produces a self-contained app shell at `dist/index.html`, static entry copies at `dist/privacy/index.html` and `dist/terms/index.html`, PWA assets, and the service worker. Deploy the contents of `dist/` to any HTTPS static host. Do not configure billing, DNS, or infrastructure from this repository.

Set `VITE_BILLING_BASE_URL` only when a non-production billing endpoint is required. The default is `https://api.sociobot.in`; factory staging can use `https://pilot-api.sociobot.in`.

## Data and privacy

Job data and optional branding stay in browser IndexedDB. The license token and its daily verification verdict use localStorage. Only the token is sent to the Sociobot verification endpoint. There are no analytics, trackers, CDN assets, remote fonts, or third-party runtime scripts. Users should keep a JSON backup before clearing browser storage.

See the in-product `/privacy` and `/terms` pages. The design thesis and generated-image provenance are in [.factory/design.md](.factory/design.md); build verification and known gaps are in [.factory/handoff.md](.factory/handoff.md).

## License

MIT — see [LICENSE](LICENSE).
