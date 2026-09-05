# Review: record deposits and show their drawdown

**Verdict: FAIL**

Reviewed on 2026-09-05 UTC.

- **Job:** record a deposit request, payments, approved drawdowns, and the balance left for one job; give the client a statement.
- **Audience:** independent consultants and tradespeople who take deposits or retainers.
- **First action before scrolling:** a fresh desktop and 390 px phone browser show **Start your first ledger**. They do not show **Try it with sample data**. The first screen also does not name the audience.

The implementation reviewed is `0e2804745b25bd05ff0b8899da79fe48bcc62b5d` (`chore: add static response security policy`). The documentation checkout was `78a61ea52d5342ab16ea994d3b665449e897a1a5`; its only changes after the implementation are prior handoff/verification reports. Fresh hashes of live `/`, `/sw.js`, and `/manifest.webmanifest` match the local `dist/` build from the implementation exactly.

**Finding count: 7. Untested claim count: 15.** A PASS is not possible with any finding or untested claim.

## Findings

### P1 — There is no one-click, isolated sample ledger

The required demo is absent. The live root has no action named “Try it with sample data,” and `/demo` has no realistic populated ledger, no persistent “Demo — sample data, nothing is saved” label, no Reset demo action, and no Start for real action. It instead shows the same empty first-use screen and **Start your first ledger**.

This is also unsafe as a demo route: in a fresh browser profile I created a job at `/demo`, then opened `/`; the same job was visible. Both paths use IndexedDB database `retainer-ledger-v1`, so `/demo` is not a separate storage namespace and can write ordinary user data. `.factory/demo.md` is missing.

Required repair: add a seeded `?demo=1` or `/demo` entry that uses a separate `demo:` namespace, contains realistic populated work, carries the persistent label and Reset/Start-for-real controls, and has browser tests that prove it never reads or writes the real namespace.

### P1 — The public claims have no claims inventory or contract tests

`.factory/claims.json` is missing. There are no `@claim:` tests, and no declared claim commands to run from the clean checkout. `npm test`, `npm run build`, `npm run test:e2e`, and `npm run check` pass, but the tests run against manually created data on a local preview, not the required demo entry point. They therefore do not satisfy the claims contract.

I counted these 15 distinct public claim bundles as untested: separation of requested/received money; the four record types and balance calculation; append-only adjustments; timestamped one-page PDF; complete CSV; JSON backup/import; persistence in IndexedDB; offline PWA; no account or sync; local-only ledger data; no analytics/trackers/CDNs; license requests exclude ledger data; damaged-data recovery; one free job; and the $29 one-time unlimited-jobs/custom-branding unlock.

Required repair: add the complete claims inventory and exactly one `@claim:<id>` browser test per item. Each must start from the sample sandbox, assert the observable result, and test privacy request origins for the privacy claims. Add `.factory/copy-audit.md` too; it is required by the plain-words contract and is absent.

### P1 — The visible PWA update action remains broken

The earlier `verification-2.md` P1 is still present. Live bytes match the unchanged implementation. `src/main.ts:331` sends `SKIP_WAITING` to `navigator.serviceWorker.controller`, which is the old active worker, while the update toast is displayed for `registration.waiting`. `public/sw.js:29` correctly handles the message only when the waiting worker receives it.

The documented two-version result therefore still applies: **Update now** leaves a waiting worker waiting. Repair it by retaining the registration and messaging `registration.waiting`, handling a missing/racing worker, then add a two-version browser regression that proves controller change, reload, and old-cache cleanup.

### P2 — Four phone targets are below the 44 px minimum

Fresh 390 × 844 live measurements are unchanged: Home is 42 × 42 px, Data is 42 × 44 px, Privacy is 42.6 × 19.5 px, and Terms is 35.4 × 19.5 px. Axe does not flag this, but it fails the stated touch-target requirement.

### P2 — Static assets do not have the promised immutable caching policy

Live `/sw.js`, `/manifest.webmanifest`, `/icon.svg`, and `/assets/hero-night-ledger-480.avif` all return `Cache-Control: public, must-revalidate, max-age=30`. Asset names are not content-hashed. This remains the earlier caching finding. Version public asset names and then give immutable, long-lived caching only to the versioned assets.

### P2 — Required route and discovery structure is incomplete

`/no-such-page` returns HTTP 200 and renders the normal ledger; it is not a designed 404. `public/404.html` and `public/sitemap.xml` are missing, and live `/sitemap.xml` returns 404. The root head has a description, manifest, and SVG favicon, but lacks a canonical URL, Open Graph/Twitter metadata and image, and an Apple touch icon. `/demo` also retains the root title rather than a Demo title.

### P2 — The first screen does not meet the plain-words landing contract

The only h1 is **Retainer Ledger**, which names the product rather than the job. “A clean trail, from deposit to done” and “Give every deposit a story your client can follow” are non-essential marketing language, while the first screen does not say the product is for consultants and tradespeople. Replace these with a short job headline, one audience-and-outcome sentence, and the required sample action.

## Evidence that passed

- Clean setup: `npm ci` completed with 0 vulnerabilities. `npm test` passed 4/4, `npm run build` produced `dist/`, `npm run test:e2e` passed 18/18, and `npm run check` passed end to end.
- Fresh live desktop and phone loads had no console or page errors. `/opt/fleet/lib/verify-url.sh` passed: title present, `lang=en`, one h1, main landmark, no missing image alt text, and no unlabeled buttons.
- In a new live browser profile, a $1,000 request started at $0 held; a $750 payment changed it to $750; a $250 approved drawdown changed it to $500; that balance survived reload. A $500.01 drawdown was rejected with the remaining balance. A zero deposit request was rejected.
- PDF and CSV exports worked. The PDF filename was `harbour-joinery-repair-statement.pdf`, began `%PDF-1.4`, and contained a generated-at timestamp. The CSV had its header and three activity rows.
- The P0 production offline-reload finding is repaired: after the live worker controlled the page, an offline reload showed the ledger, the Offline indicator, and the persisted $500 balance.
- The malformed-import blocker is repaired: a v1-shaped backup missing `updatedAt` was rejected with “This file is not a Retainer Ledger v1 backup,” and reload remained usable. Deliberately corrupting local data showed the recovery screen and confirmation dialog; clearing it returned to an empty usable ledger.
- Axe WCAG 2 A/AA scans found zero serious or critical violations on live empty desktop, populated desktop, 390 px phone, Privacy, and Terms pages. Keyboard first Tab reached the visible 3 px cyan Skip to ledger focus ring. Reduced motion set control transition duration to `0.00001s`. Phone overflow was zero.
- Privacy smoke test on an unlicensed fresh load observed only the product origin. Live CSP, Permissions-Policy, HSTS, `X-Content-Type-Options`, referrer policy, and `X-Frame-Options: DENY` are present. Privacy and Terms render with their own correct titles and one h1.

## Earlier findings and current disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| P0 production offline reload | Fixed | Fresh live controlled-worker offline reload passed with persisted data. |
| P1 malformed import corrupted local ledger | Fixed | Fresh malformed import was rejected before write; reload stayed usable; corrupt-storage recovery and clear path worked. |
| P1 Update now cannot activate waiting worker | Open | The unchanged live implementation still posts to the old controller, not `registration.waiting`. |
| P2 small mobile targets | Open | Fresh live measurements match the earlier report. |
| P2 static cache policy | Open | Fresh live headers remain `max-age=30`, not immutable/versioned. |
| P2 missing security headers in verification.md | Fixed | Current live response has CSP, Permissions-Policy, HSTS, nosniff, referrer policy, and frame denial. |

## Commands and scope

Executed from the clean checkout: `npm ci`; `npm test`; `npm run build`; `npm run test:e2e`; `npm run check`; and `/opt/fleet/lib/verify-url.sh https://deposit-drawdown-ledger.sociobot.in /work/.evidence/review-1`. Axe was run through the installed Playwright Axe integration on the live routes named above. There was no claims file and hence no claim command to execute; that absence is a finding, not a passing result.

The application is static and has no product backend, tenant, health, restart-persistence, or 429/Retry-After surface to test. The hosted checkout link was inspected but not followed because this review did not authorize a purchase.
