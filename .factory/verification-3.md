# Verify recording deposits and drawdowns — FAIL

**Date:** 2026-09-05 UTC  
**Implementation reviewed:** `1990de18b315120ccbaca8aa07d46c951e32a563` (`fix: add isolated demo and release repairs`)  
**Documentation/test checkout:** `f2e1405f8c10b799c273b6a9fb2d6b76f03220c7` (`docs: record pending static deployment`)  
**Live URL:** <https://deposit-drawdown-ledger.sociobot.in>

## Verdict

**FAIL — one P1 finding and one incompletely tested public paid claim remain.**

## Job, audience, and first action

- **Job:** Record a deposit request, payments, approved drawdowns, and the remaining deposit for a job; share a statement.
- **Audience:** Independent consultants and tradespeople who take deposits or retainers.
- **First action before scrolling:** **Try it with sample data**. It opens the populated Elm Street kitchen joinery ledger.

Fresh desktop and 390 px phone browsers showed the same plain-language h1,
audience sentence, sample action, and three factual lines without scrolling.

## Finding

### P1 — the advertised one-time unlock cannot be bought

The live **Buy the one-time unlock** link is
`https://api.sociobot.in/api/v1/products/deposit-drawdown-ledger/checkout`.
A public GET from the live link crawl returned **HTTP 404**. The paid path is
therefore broken before a customer can obtain the license that enables unlimited
jobs and statement branding.

This is also an incomplete public-claim test. The declared
`@claim:one-time-unlock` test passed, but it mocks a valid verification result;
it does not prove that the visible hosted checkout endpoint exists or can begin
the advertised purchase. No purchase was attempted.

Required disposition: register/restore the product checkout endpoint in the
Sociobot billing service, then rerun the live link crawl and a non-purchasing
checkout-start smoke test. The product code is not the source of this finding.

## Clean checkout and claim evidence

I cloned `main` into a new temporary directory, ran `npm ci` (68 packages, 0
vulnerabilities), then invoked every command declared in
`.factory/claims.json` separately. All 16 commands passed. The declared
claim tests start at `/demo`; no claim command was missing or failed.

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
| one-time-unlock | Passes its mocked-license assertion; checkout-start coverage is incomplete (finding above) |

`npm test`, `npm run build`, `npm run test:e2e`, and `npm run check` also
passed from that checkout. The browser suite recorded **54 passed, 2 skipped**;
the skips are the intentionally project-scoped desktop worker-update and phone
touch-target checks. `test-results/.last-run.json` records `status: passed`.

## Live product evidence

- The current HTTPS output is the repaired candidate, not the August build.
  Fresh SHA-256 values of live `/`, `/sw.js`, and
  `/manifest.v3.webmanifest` exactly matched the fresh local build:
  `24dac551…961ca2`, `5ff80b29…dfce88`, and `c0cc4672…ae18aa2`.
- `/demo` immediately showed its persistent **Demo — sample data, nothing is
  saved** banner, Elm Street kitchen joinery, requested $4,800.00, payments
  $4,800.00, approved work $2,200.00, adjustment -$150.00, and remaining
  $2,450.00. A new demo payment appeared in its trail; **Reset demo** removed
  it; real mode did not contain it.
- A fresh real ledger accepted a $0.01 request, payment, and approved
  drawdown, reached $0.00, and retained the activity after reload. Zero amounts
  and a $0.02 drawdown against $0.01 remaining produced clear errors. A PDF
  download began `%PDF-1.4`, contained `Generated`, had one page, and used the
  job filename.
- A fresh controlled `/demo` page reloaded offline with the sample ledger and
  visible **Offline** state. Its cache was `retainer-ledger-v1.1.0-shell`.
- Fresh unlicensed demo activity made requests only to the product origin. No
  console or page errors occurred in the desktop, phone, product-flow, or
  offline checks.
- Phone checks at 390 × 844 found no horizontal overflow and these targets at
  least 44 px tall and wide: home 44 × 44, Ledger 69.8 × 44, Demo 62.7 × 44,
  Privacy 72.5 × 44, Data 44 × 44, and Terms 44 × 44. First Tab reached the
  visible skip link with the cyan 3 px focus outline. Reduced-motion button
  transition duration was `0.00001s`.
- `/opt/fleet/lib/verify-url.sh` passed on the live root: title, `lang=en`, one
  h1, main landmark, image alt text, labels, and no console errors. Playwright
  Axe WCAG 2 A/AA scans found zero serious or critical violations on `/`,
  `/demo`, `/privacy`, and `/terms`.
- Route titles were correct for the root, demo, privacy, and terms pages.
  `/no-such-page` deliberately returned HTTP 404 with the designed **This page
  was not found.** page and a ledger link; this is expected, not a defect.
  Product-owned internal links returned 200. The sole dead link was the hosted
  checkout above.
- Live responses supplied CSP, Permissions-Policy, frame denial, nosniff,
  strict referrer policy, HSTS, immutable caching for versioned assets, and
  revalidatable HTML and worker responses.

## Earlier findings

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| Offline reload bypassed the production origin | Fixed | Controlled live `/demo` reloaded offline. |
| Malformed import could leave the ledger unusable | Fixed | Clean suite includes atomic rejection and recovery; the damaged-data claim passed. |
| Update now targeted the old worker | Fixed | The two-version worker regression passed in the clean browser suite. |
| Four mobile targets were under 44 px | Fixed | Fresh live 390 px measurements above. |
| Public assets lacked immutable versioned caching | Fixed | `.v3` assets and live immutable headers are present. |
| Discovery metadata, static routes, and 404 were missing | Fixed | Versioned manifest, sitemap, route titles, and designed HTTP 404 are live. |
| Landing did not name the job, audience, and sample action | Fixed | Fresh desktop and phone first-screen check above. |

## Scope

This is a static local-first PWA. It has no product backend, tenant, health,
restart-persistence, or rate-limit endpoint to exercise. The hosted billing
endpoint was inspected only as the product's public checkout link; no payment,
credential, or infrastructure action was attempted.

Evidence generated by the URL verifier is in
`/work/.evidence/verification-3-verify-url/`.
