# Verify recording deposits and drawdowns — FAIL

**Date:** 2026-09-05 UTC

**Product implementation:** `1990de18b315120ccbaca8aa07d46c951e32a563`

**Checkout-test commit:** `155d4986e1d453866a59e033ccf37b8c093a652c`

**Documentation checkout reviewed:** `feee059e0bac4dcff818a15375bdff8416703234`

**Live URL:** <https://deposit-drawdown-ledger.sociobot.in>

## Verdict

**FAIL — 1 P2 finding, 0 untested claims.**

The ledger, demo, offline behavior, exports, recovery, checkout start, invalid-license rejection, and fixture-backed paid controls work. The root page still omits required sections from the supplied site-structure contract. A PASS is not permitted while that finding remains.

## Job, audience, and first action

- **Job:** Record deposit requests, received payments, approved drawdowns, adjustments, and the remaining deposit; share a client statement.
- **Audience:** Independent consultants and tradespeople who take deposits or retainers.
- **First action before scrolling:** **Try it with sample data**. It opens the populated Elm Street kitchen joinery ledger.

Fresh 1440 × 900 desktop and 390 × 844 phone profiles showed the job, audience, and action before scrolling.

## Finding

### P2 — The landing page omits three required site sections

The supplied site-structure contract requires the root landing page to continue from the first screen and product preview into:

1. **How it works** in three steps.
2. **What it does not do / privacy** in plain words.
3. A visible **paid tier** section with the exact price and paid deliverables.

The live root ends after the app’s empty ledger screen and footer. It has no three-step explanation, no landing privacy/non-goals section, and no visible paid-tier section naming unlimited jobs and custom PDF branding. The first screen mentions “More jobs cost $29 one time,” while the deliverables appear only after opening the **Unlock** dialog.

This does not break ledger use, but it fails the mandatory landing-page structure. Add the three sections after the live product area without changing the app-first first screen.

## Claim verification

From a clean `npm ci`, every command in `.factory/claims.json` ran separately. Each passed in both configured projects.

| Claim | Result |
| --- | --- |
| demo-isolation | Pass |
| requested-not-held | Pass |
| record-types-and-balance | Pass |
| append-only-adjustments | Pass |
| timestamped-pdf | Pass |
| complete-csv | Pass |
| json-backup | Pass |
| indexeddb-persistence | Pass |
| offline-reload | Pass |
| no-account-or-sync | Pass |
| local-only-data | Pass |
| no-trackers-or-cdns | Pass |
| license-request-excludes-ledger-data | Pass |
| damaged-data-recovery | Pass |
| one-free-job | Pass |
| one-time-unlock | Pass |

Independent supplements also proved the strongest readings of two claims. Importing valid jobs and records with existing IDs added zero items and preserved the originals. With a recorded valid verification response, the live client created second and third jobs, saved custom branding into a downloaded PDF, and retained the paid state after an offline reload.

No public claim remained untested. No completed purchase was attempted; final Dodo token delivery still needs separately authorized billing QA.

## Clean repository gates

- `npm ci`: passed; 68 packages, 0 vulnerabilities.
- `npm test`: 4 passed.
- `npm run build`: passed; `dist/` produced. `dist/index.html` is 59.83 KB, 18.28 KB gzip.
- `npm run test:e2e`: 54 passed, 2 intentional project-specific skips.
- `npm run check`: passed; 4 unit tests and 54 browser tests passed again.
- All 16 claim commands: passed individually; 32 project executions passed.

The skips are intentional: the two-version update regression runs only in desktop Chromium, while touch-target measurements run only in the phone project.

## Live product evidence

- Desktop and phone each entered the one-click sample, showed its persistent demo label, realistic $4,800 requested/payment totals, $2,200 approved work, −$150 adjustment, and $2,450 remaining balance. Each added a demo-only payment, reset to five sample records, entered real mode, and found zero real jobs and records.
- A fresh real ledger rejected a zero request and negative payment, accepted a $0.01 request/payment, rejected a $0.02 drawdown against $0.01, accepted a $0.01 drawdown, and retained exactly three valid records after reload.
- PDF output began `%PDF-1.4`, contained one page and a generated-at timestamp. CSV contained the header and all three real activity rows. JSON backup contained the job and all three records.
- A malformed backup was rejected without changing storage. Reload remained usable. Deliberately damaged data produced the recovery screen; its recovery download contained the damaged record, and the confirmed reset restored the sample.
- A fresh controlled phone `/demo` reloaded offline with the sample and visible **Offline** state. The live cache was `retainer-ledger-v1.1.0-shell`. A same-version update check left no waiting worker; the clean two-version regression proved **Update now**, controller change, reload, and old-cache cleanup.
- The visible $29 one-time offer returned HTTP 303 to `checkout.dodopayments.com`; the hosted checkout returned 200. A real invalid-token request returned 200 with `valid: false`, reason `invalid`, using a GET with only the `license` query key. The client remained locked with a clear error.
- The recorded valid-verification fixture stripped the token from the URL, displayed the paid state, enabled multiple jobs and branding, put branding into the PDF, and survived offline reload.
- Local ledger activity requested only the product origin. No console or page errors occurred.

## Accessibility, routes, and performance

- `/opt/fleet/lib/verify-url.sh` passed: correct title, `lang=en`, one h1, a main landmark, complete image alt text, labeled buttons, and no console errors.
- Axe WCAG 2 A/AA scans found zero violations of any impact on `/`, `/demo`, `/privacy`, `/terms`, and the designed 404.
- First Tab reached **Skip to ledger** with a 3 px visible focus outline. Enter opened the relevant dialog, focus moved to its close control, and Escape closed it.
- At 390 px, there was no horizontal overflow. Measured home, Demo, Privacy, Data, and Terms targets were at least 44 × 44 px. Reduced-motion transition duration was `1e-05s`.
- Root, demo, privacy, and terms returned 200 with route-specific titles. The unknown route intentionally returned HTTP 404 with **This page was not found.** All crawled product links passed.
- Security headers include CSP, Permissions-Policy, frame denial, nosniff, strict referrer policy, and HSTS. Versioned assets use `max-age=31536000, immutable`; HTML is revalidated.
- The manifest is 200, uses `display: standalone`, has a versioned start URL, and includes 192 px, 512 px, and maskable icons.
- Fresh mobile Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.2 s, TBT 0 ms, CLS 0, transfer 73 KiB.

## Deployment identity

The live product is byte-identical to the local build from the implementation commit:

| Resource | Local and live SHA-256 |
| --- | --- |
| `/` / `dist/index.html` | `24dac551355a6cfbe020a62256ba618e6bf1a86487dcc00588090248af961ca2` |
| `/sw.js` | `5ff80b293c95145b5efcd084feab997ec879b8a5db9c80ef2f78b592a3dfce88` |
| `/manifest.v3.webmanifest` | `c0cc4672afbbf5d7ba1c959947e43b9740c13f4acae6e5f2f001829daae18aa2` |

Commits after the implementation modify tests and reports, not shipped client files.

## Earlier finding disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| Production offline reload failed | Fixed | Fresh controlled live phone demo reloaded offline. |
| Malformed import could corrupt the ledger | Fixed | Live malformed import was atomic; damaged-data recovery and download passed. |
| Update now targeted the active worker | Fixed | Clean two-version regression passed; live same-version update left no waiting worker. |
| Phone targets were below 44 px | Fixed | Fresh 390 px measurements were all at least 44 × 44 px. |
| Static assets lacked immutable caching | Fixed | Versioned live asset returned one-year immutable caching. |
| Metadata, sitemap, and designed 404 were missing | Fixed | Route, metadata, link, and intentional HTTP 404 checks passed. |
| First screen lacked the job, audience, and sample action | Fixed | Fresh desktop and phone checks passed before scrolling. |
| One-click demo and storage isolation were missing | Fixed | Both fresh profiles passed sample, reset, and zero-real-data checks. |
| Claims inventory and claim tests were missing | Fixed | All 16 commands passed separately; supplementary edge checks passed. |
| Hosted checkout returned 404 | Fixed externally | Live checkout now returns 303 to Dodo, then hosted 200. |
| Paid test only mocked availability | Fixed | Current test performs real checkout and invalid-license checks; fixture-backed entitlement behavior was exercised independently. |
| Security headers were absent | Fixed | Required live security headers are present. |

## Scope and limitation

This is a static local-first PWA. It has no product backend, tenant, server-side product database, health endpoint, restart-persistence surface, or product rate-limit endpoint to test.

No authorized completed purchase or issued customer license was available. This verification did not submit payment and does not claim to prove final Dodo token delivery. It proves the live checkout start, real invalid validation, and the client entitlement path against the documented valid response.

Evidence is under `/work/.evidence/verification-4-live/` and `/work/.evidence/verification-4-verify-url/`.
