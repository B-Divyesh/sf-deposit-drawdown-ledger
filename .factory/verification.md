# Independent verification — FAIL

**Verifier:** factory QA  
**Date:** 2026-08-28 UTC  
**Candidate:** `01d1dabd65175bab24bfbdf478df04062af4317f` (`01d1dab chore: verify release and document handoff`)  
**Production URL:** <https://deposit-drawdown-ledger.sociobot.in>

## Verdict

**FAIL — do not release this candidate as an offline PWA.** The live site is exactly this candidate, but two release-blocking local-first/PWA defects were reproduced on production.

## Blocking defects

### P0 — production offline reload fails

The core artifact is an offline PWA, yet a fully installed/controlled production page cannot reload offline.

Fresh Chromium evidence on the production URL:

1. Loaded the root, waited for `navigator.serviceWorker.ready` and for an active controller.
2. Confirmed cache `retainer-ledger-v1.0.0-shell` contains `/`, `/index.html`, `/offline.html`, manifest, icons, and hero assets.
3. Switched the browser context offline and reloaded.
4. Reload failed with `net::ERR_INTERNET_DISCONNECTED`; no document remained available.

The cause is visible in the deployed, candidate-identical `sw.js`:

```js
if (url.hostname.endsWith('sociobot.in')) return;
```

That condition bypasses the service worker not only for the billing API but also for `deposit-drawdown-ledger.sociobot.in` itself. The local Playwright offline test passes only because its preview host is `127.0.0.1`, which does not match that condition.

### P1 — accepted malformed JSON import can make the local ledger unusable

In a clean production browser profile, uploaded a JSON object that passes the app's documented `schemaVersion: 1` import predicate but has two jobs without `updatedAt`. The import code writes the jobs before the subsequent sort throws.

Observed UI evidence:

```text
Import: Cannot read properties of undefined (reading 'localeCompare')
Reload: Your local ledger could not open.
        Cannot read properties of undefined (reading 'localeCompare')
```

The user is left at the fatal-error screen on every reload and has no in-product recovery/clear-data action. This violates robust invalid-input recovery and risks access to local records. A complete, correctly shaped JSON backup was also imported separately and worked (`Imported job`, remaining `$0.00`, live announcement `Backup merged: 1 jobs and 1 records added.`).

## Passing evidence

### Candidate, install, build, and repository gates

- Clean worktree initially at the requested SHA; `npm ci` completed with **0 vulnerabilities**.
- `npm test`: **4/4** Vitest tests passed.
- `npm run build`: passed (`tsc --noEmit`, Vite, static routes); `dist/` produced.
- `npm run test:e2e`: **12/12** Playwright tests passed (Chromium desktop and the configured mobile project).
- `npm run check`: passed (the three commands above). No separate lint script is defined in `package.json`.
- Production build output: inline application JS/CSS HTML is **49,902 B** (15,980 B gzip); no font payload; mobile AVIF hero **17,543 B**. These are within the stated 200 KB JS, 50 KB CSS, 120 KB font, and 300 KB mobile-image budgets.

### Deployment identity

Production is not a stale/different deploy. SHA-256 values match the freshly built `dist/` files exactly:

| File | SHA-256 |
| --- | --- |
| `/` / `dist/index.html` | `fca784b7d896b800e4e0a230b137e5b9330605125a7922525b861376d16a8189` |
| `/sw.js` | `6111c09672aa0589100b5d25193e73ffa4486c6fcdf0bcbbc9b2ef8493ad871d` |
| `/manifest.webmanifest` | `9bf35b18b479177b5be81b2fbe2adb17efaf88ebbd35cca429b4899ca997464d` |
| `/offline.html` | `9479cd6404af9a97c768f0549fe0d59ca02c2cf1b2af24af5f3b3b3db9219dda` |
| `/privacy`, `/terms` | same 49,902-B HTML hash as `dist/privacy/index.html` and `dist/terms/index.html` |

### Product flows and recovery checks on live HTTPS

- Normal and boundary ledger flow: created a `$0.01` deposit request, recorded `$0.01` payment, recorded `$0.01` approved drawdown, and saw `$0.00` remaining.
- Invalid/recovery paths: zero deposit request was rejected; negative payment was rejected; a `$0.02` drawdown against `$0.01` remaining was rejected with the remaining balance; a negative adjustment was recorded as a separate immutable line and showed the explicit negative-balance warning.
- Export: PDF download had filename `qa-boundary-job-statement.pdf`, `%PDF-1.4` header, and a generated-at timestamp; CSV exported five rows. Valid JSON import was exercised as noted above.
- Privacy: an unlicensed first-use session made only same-origin document/image requests; no analytics, remote fonts, or third-party runtime requests were observed. License verification was not invoked because no license was supplied. Privacy and terms routes rendered locally.
- Console/page errors: none during normal live flow.

### Accessibility, keyboard, responsive, motion, and performance

- Live axe WCAG 2 A/AA scans on empty and populated states: **0 serious/critical** violations.
- Semantics on live root: `lang="en"`, one `h1`, one `main`, title present; descriptive empty-state image loaded on both desktop and 390 px mobile.
- Keyboard: first Tab focuses visible `Skip to ledger` link (cyan 3 px outline); Enter opens the new-job dialog; Escape closes it. Focus-visible outline is `rgb(83, 243, 208) solid 3px` with 3 px offset.
- 390 × 844 viewport: no horizontal overflow (`scrollWidth = clientWidth = 390`); primary Record activity target is 320 × 46 px and adjacent export targets are 154 × 50 px. Desktop and 390 px paths were exercised.
- Reduced-motion context changes button transition duration to `0.00001s` and suppresses transform motion.
- Fresh live mobile Lighthouse: Performance **95**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 1.0 s, LCP 1.2 s, TBT 250 ms, CLS 0, transfer 70 KiB.

## Headers, policies, and caching observations

- Root, worker, manifest, and assets return HTTPS with HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- No `Content-Security-Policy`, `Permissions-Policy`, or `X-Frame-Options` header was served. This is a **P2 security-hardening gap**, not the reason for the FAIL.
- All checked static responses use `Cache-Control: public, must-revalidate, max-age=30`, including the 17.5 KB AVIF, manifest, and worker. This does not meet the stated long-lived immutable caching policy for static assets and is a **P2 performance/caching gap**. It does not mitigate the P0 because the current worker bypasses the production origin.

## Required next steps

1. Change service-worker routing so only the external billing API is bypassed; same-origin navigations must be served from the precached shell/fallback offline. Add a production-hostname offline-reload test.
2. Validate every persisted job/record field before opening the import transaction, reject malformed imports without writing anything, and provide an in-product recovery path for corrupted local data. Add regression tests for atomic failed imports and reload after rejection.
3. Add CSP/Permissions-Policy/frame protection at deployment and immutable caching for versioned static assets, then rerun the full verification.
