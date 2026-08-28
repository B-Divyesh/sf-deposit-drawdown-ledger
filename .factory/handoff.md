# Retainer Ledger v1 handoff

## Shipped

- A production Vite + TypeScript offline PWA for multiple job ledgers. Each job records formal deposit requests separately from payments received, approved drawdowns, and signed corrections.
- Append-only record history in IndexedDB. Existing entries have no edit/delete path; corrections are dated adjustment lines. Drawdowns larger than the currently recorded balance are rejected with an actionable explanation.
- Clear requested, received, drawn-down, adjusted, and remaining totals in six currencies. Records survive reload, tab close, install, and tested offline restarts.
- A real one-page PDF statement with job/client/reference, summary totals, record trail, generated-at timestamp, and neutral disclaimer. CSV contains the complete job history. JSON backup/import merges unseen IDs without overwriting existing records.
- One useful free ledger. A $29 one-time Sociobot unlock adds unlimited jobs and local business/contact branding on PDF statements. Return-token capture, daily cached verification, offline optimistic cached unlock, revoked-license fallback, restore-by-paste, buy link, privacy, and terms are implemented without a hardcoded billing product ID.
- A versioned service worker, install manifest, 192/512/maskable icons, network-first navigation fallback, cache-first local assets, offline fallback, client claim, and an in-app update action. The production HTML embeds its 32.8 KB JS and 15.7 KB CSS payload so first-install offline reloads cannot strand a partially cached shell.
- Product-specific night-market visual system and original generated illustration. Candidate v2 was visually reviewed and ships as 18 KB mobile AVIF / 20 KB mobile WebP plus larger AVIF/WebP/JPEG fallbacks. Prompts and source candidates are retained under `assets/src/`.
- Static-safe `/privacy` and `/terms` entry files, README, MIT license, robots policy, and no analytics, trackers, CDN assets, remote fonts, or third-party runtime scripts.

## Verification (2026-08-28 UTC)

- `npm test`: 4/4 unit tests pass (money parsing, separation of requests from held funds, balance effects, and timestamped one-page PDF generation).
- `npm run build`: passes; output is `dist/` with `dist/index.html`, `dist/privacy/index.html`, and `dist/terms/index.html`.
- `npm run test:e2e`: 12/12 Chromium checks pass across desktop and a 390 × 844 mobile viewport. Coverage includes create → payment → drawdown → remaining balance, refresh persistence, PDF download, serious/critical axe WCAG A/AA scan, console/page-error smoke test, service-worker offline reload, direct privacy route, returned-license storage/verification, and custom branding.
- Factory `verify-url.sh`: HTTP 200; load 710 ms; zero console/page errors; title present; `lang="en"`; exactly one `h1`; main landmark present; zero missing alt attributes; zero unlabeled buttons.
- Lighthouse mobile against the production preview: Performance 100, Accessibility 100, Best Practices 100, SEO 100. FCP 0.8 s, LCP 1.5 s, TBT 70 ms, CLS 0, Speed Index 0.8 s, transferred size 70 KiB.
- Budgets: self-contained production HTML 49.9 KB uncompressed / 16.0 KB gzip; source JS 32.8 KB and CSS 15.7 KB before inlining; no font payload; mobile hero 18 KB AVIF / 20 KB WebP. All are below the 200 KB JS, 50 KB CSS, 120 KB font, and 300 KB hero limits.
- `npm audit`: zero known dependency vulnerabilities.

## Run

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

The exact deploy build command is `npm run build`; publish `dist/`.

## Known gaps / factory next steps

- Register the production and staging Sociobot billing products and return URLs. Browser tests mock the documented verification response because no product ID or live buyer license belongs in this repository.
- Statements intentionally remain one page: the newest 18 records appear in the PDF and it points clients to the complete CSV when older lines are omitted.
- Cross-device sync, automatic bank matching, payment collection, invoice numbering, accounting entries, tax logic, and revenue recognition are out of scope. Users move data with JSON backups.
- Lighthouse values are from the local production preview in the worker container; deployment latency and cache headers should be rechecked after factory release.
