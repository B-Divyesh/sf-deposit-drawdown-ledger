# Retainer Ledger — repair handoff

## Release status: PASS

Repaired and deployed the independent QA blockers reported against candidate
`01d1dabd65175bab24bfbdf478df04062af4317f`. The repair is committed as
`d3ded86 fix: restore offline PWA and safe backup recovery`; production response
policy hardening is `0e28047 chore: add static response security policy`.
Both commits are pushed to `main` and deployed to
<https://deposit-drawdown-ledger.sociobot.in> on 2026-08-28 UTC.

## What changed

1. **P0 — real-host offline reload:** the service worker now bypasses only the
   external `https://api.sociobot.in` license endpoint. Same-origin production
   navigations are handled by the cache/network navigation strategy. The cache
   name and PWA start URL were advanced to `v1.0.1`, ensuring installed clients
   receive the fixed worker and an update ticket.
2. **P1 — atomic, validated JSON import:** every job, record, branding, date,
   timestamp, ID, currency, and relationship is checked before an import opens
   a write transaction. Missing `updatedAt`, duplicate IDs, invalid records,
   and orphan records are rejected without writing data.
3. **Corrupted-local-data recovery:** local data is validated before sorting on
   open. If it is damaged, the product presents an in-app recovery-copy download
   and a clearly confirmed local-ledger reset; it does not strand the user on a
   fatal screen.
4. **Response policy:** static deployment now sends CSP, Permissions-Policy,
   `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and the existing
   strict referrer policy.

The researched scope, local-first storage, immutable ledger behavior, exports,
one-time license flow, visual system, and deployment class are unchanged.

## Regression coverage

The browser suite now runs on desktop Chromium and the configured 390 × 844
mobile project, including:

- a TLS preview mapped to `deposit-drawdown-ledger.sociobot.in`, with an active
  worker, offline context, reload, and visible offline UI;
- the verifier's malformed v1 JSON shape (two jobs missing `updatedAt`), proving
  rejection, **0 jobs / 0 records** persisted, and a normal reload afterward;
- a deliberately corrupt IndexedDB job followed by recovery-copy availability,
  confirmed clear-data recovery, and an empty usable ledger.

## Verification evidence

Clean local verification:

```sh
npm ci                 # 0 vulnerabilities
npm run check          # PASS: 4/4 Vitest, build, 18/18 Playwright
```

`npm run build` ran TypeScript checking and produced `dist/` with root
`index.html`, `/privacy`, `/terms`, PWA manifest, worker, offline fallback, and
icons. Built `dist/index.html` is 53,185 B (16.75 kB gzip); the mobile AVIF is
17,543 B. No runtime fonts or third-party scripts are shipped.

Live, post-deploy checks on the production HTTPS URL:

- SHA-256 matches the deployed root and worker exactly:
  - `index.html`: `30eb7b3351da91e639d5cd1c6ec9987bab44d503a4113f14e218d991eeaa51d5`
  - `sw.js`: `fdfb9019c521dfc3b420c3650e854f005ff9619a9feb047fed5cd7de76fec8f9`
- Controlled production service worker: cache
  `retainer-ledger-v1.0.1-shell`; offline reload retained the `Retainer Ledger`
  heading and visible `Offline` state.
- Exact malformed-import check: rejection message shown, IndexedDB stayed at
  `{ jobs: 0, records: 0 }`, reload had no fatal-error screen.
- Desktop keyboard: first Tab focused `Skip to ledger`; console and page errors
  were empty. Live axe WCAG 2 A/AA scan had no serious or critical violations.
- 390 px mobile: `scrollWidth = clientWidth = 390`.
- Fresh unlicensed live load made requests only to
  `https://deposit-drawdown-ledger.sociobot.in`.
- `/opt/fleet/lib/verify-url.sh` passed: title, `lang=en`, one `h1`, `main`,
  image alt text, labeled buttons, and no console errors; desktop load was
  768 ms.
- Live Lighthouse (mobile-style headless Chromium): Performance **100**,
  Accessibility **100**, Best Practices **100**, SEO **100**; FCP **0.9 s**,
  LCP **1.2 s**, TBT **90 ms**, CLS **0**.
- Live headers include the configured CSP, Permissions-Policy,
  `X-Frame-Options: DENY`, nosniff, HSTS, and strict referrer policy.

## Known gap / next step

The static host continues to use `Cache-Control: public, must-revalidate,
max-age=30` for unversioned image and icon filenames. This is the independent
verifier's non-blocking P2 caching observation; it is deliberately not marked
immutable until those public filenames are content-versioned. It does not affect
the fixed PWA worker, whose cache name is versioned. A future asset refresh
should rename assets with content/version hashes and then add immutable route
caching.

## Run and deploy

```sh
npm ci
npm run check
npm run build
/opt/fleet/lib/deploy-static.sh deposit-drawdown-ledger dist
```
