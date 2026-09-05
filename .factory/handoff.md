# Retainer Ledger handoff

## Product

- **Job:** Record a deposit request, payments, approved drawdowns, and the remaining deposit for a job. Share a clear statement with the client.
- **Audience:** Independent consultants and tradespeople who take deposits or retainers.
- **First action:** **Try it with sample data**. It opens the populated Elm Street kitchen joinery ledger.
- **Product implementation SHA:** `1990de18b315120ccbaca8aa07d46c951e32a563` (`fix: add isolated demo and release repairs`). The current static build is byte-for-byte identical to that implementation because this repair changes test and verification coverage, not client assets.
- **Checkout-regression SHA:** `155d4986e1d453866a59e033ccf37b8c093a652c` (`test: verify hosted checkout and license response`).

## Repair completed

The factory billing operation has restored the registered **Retainer Ledger Unlimited Jobs** offer at **USD 29 one time** in both Live and Test. The product's visible Live checkout link now returns HTTP 303 to the hosted Dodo checkout, and the hosted page returns HTTP 200 without attempting a purchase.

The paid-claim regression now proves observable outcomes instead of only mocking entitlement:

1. It opens the visible offer from `/demo` and requests its actual checkout link.
2. It asserts the public checkout returns 303 to the Dodo host and that the hosted checkout responds 200.
3. It pastes a deliberately invalid token through the real app and confirms that it remains locked with a clear error.
4. It uses a recorded valid verification response only to cover the local unlock UI, unlimited-job state, and statement-branding control.

The real product remains local-first. One free job, exports, accessibility features, the demo sandbox, and offline use remain available without a license.

Public offer metadata is recorded at `/work/.evidence/billing-offer.json`. The required catalog text is verb-first, under 120 characters, and is present both in `.factory/catalog-description.txt` and `/work/.evidence/catalog-description.txt`.

## Verification

From a clean dependency install on 2026-09-05 UTC:

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run check
```

- `npm ci`: 68 packages, 0 vulnerabilities.
- `npm test`: 4 passed.
- `npm run build`: passed; `dist/` contains the static routes, designed 404, PWA files, sitemap, and manifest. Initial HTML is 59.83 KB (18.28 KB gzip); its inlined JS/CSS stays within the static budget.
- `npm run test:e2e`: passed: 54 browser checks passed and two deliberate project-scoped checks skipped (desktop-only service-worker update and phone-only touch measurements).
- `npm run check`: passed.
- Every one of the 16 commands in `.factory/claims.json` was also run separately from the clean install and passed in the desktop and phone projects.

Live verification against `https://deposit-drawdown-ledger.sociobot.in` passed:

- `/opt/fleet/lib/verify-url.sh` found HTTP 200, the correct title and language, one h1, a main landmark, no missing image alt text, no unlabeled buttons, and no console errors.
- Fresh desktop and 390 px phone browsers showed the job, audience, and sample action before scrolling. Both loaded the realistic sample, added a demo-only payment, reset it, entered real mode, and confirmed zero real jobs and records.
- Axe WCAG 2 A/AA scans on `/`, `/demo`, `/privacy`, and `/terms` had no serious or critical violations.
- A fresh controlled 390 px live `/demo` page reloaded offline with the sample ledger and its Offline state.
- `/`, `/demo`, `/privacy`, and `/terms` returned 200. An unknown route returned the intended 404. The checkout endpoint returned 303.
- The current live root, service worker, and manifest SHA-256 values match the local implementation build: `24dac551…961ca2`, `5ff80b29…dfce88`, and `c0cc4672…ae18aa2`.

## Earlier finding disposition

| Finding | Status | Evidence |
| --- | --- | --- |
| Production offline reload | Fixed | Fresh controlled live phone `/demo` reload passed offline. |
| Malformed import could corrupt data | Fixed | Atomic import and recovery claim tests pass. |
| Update now targeted the active worker | Fixed | Two-version worker regression passes. |
| Phone targets below 44 px | Fixed | The mobile measurement regression passes. |
| Assets lacked immutable versioned caching | Fixed | Versioned assets and scoped immutable headers remain live. |
| Missing metadata, discovery routes, and 404 | Fixed | Route checks, titles, sitemap, and HTTP 404 pass. |
| First screen lacked the job, audience, and sample action | Fixed | Fresh desktop and phone checks pass before scrolling. |
| $29 hosted checkout returned 404 | Fixed externally | Live checkout returns 303 and the Dodo page returns 200. |
| Paid claim only mocked checkout availability | Fixed | `@claim:one-time-unlock` now performs the live non-purchasing checkout and invalid-license checks. |

## Known limitation

No authorized completed purchase or issued customer license was available in this product workspace. The repair verifies the real checkout start and the real invalid-license response; it verifies a successful-license response against the documented API contract with a fixture. Billing QA can perform a separate authorized purchase to prove Dodo's final token delivery, but no credential or payment action was invented here.

## Run and deploy

Run locally with `npm ci && npm run dev`. Run the full gate with `npm run check`. Build with `npm run build`; deploy the resulting `dist/` directory via the product's existing static-host workflow. No backend, product database, secrets, or infrastructure configuration is required or was changed.
