# Checkout repair verification — PASS

**Date:** 2026-09-05 UTC  
**Product implementation:** `1990de18b315120ccbaca8aa07d46c951e32a563`  
**Checkout-regression commit:** `155d4986e1d453866a59e033ccf37b8c093a652c`  
**Live URL:** <https://deposit-drawdown-ledger.sociobot.in>

## Result

The former P1 is repaired. The visible **Buy the one-time unlock** link now starts a live hosted checkout: the product API returns HTTP 303 to Dodo and the Dodo page returns HTTP 200. No purchase was submitted.

The updated `@claim:one-time-unlock` test begins at `/demo`, finds the visible offer, requests the actual checkout link, proves the 303 and hosted 200 outcomes, pastes a deliberately invalid token through the real application, and confirms the product remains locked. It then uses the documented valid verification response shape to prove the local unlimited-job and branding entitlement controls.

The real validation endpoint returned HTTP 200 with `valid: false` and reason `invalid` for the deliberately invalid probe. No ledger data was sent.

## Product check

- **Job:** Record deposit requests, payments, approved drawdowns, and the remaining deposit; share a statement.
- **Audience:** Independent consultants and tradespeople who take deposits or retainers.
- **First action:** **Try it with sample data**. It opens the populated Elm Street kitchen joinery ledger.

Fresh desktop and 390 px phone browser runs found all three before scrolling. Each loaded the sample, recorded a demo-only payment, reset it, entered real mode, and found no real jobs or records.

## Evidence

- Clean `npm ci`: 68 packages, 0 vulnerabilities.
- `npm test`: 4 passed.
- `npm run build`: passed and produced `dist/`.
- `npm run test:e2e`: 54 passed, 2 intentional project-scoped skips.
- `npm run check`: passed.
- All 16 declared claim commands ran separately from the clean checkout and passed in both configured browser projects.
- `verify-url.sh` passed on the live root with no console errors and complete basic semantics.
- Axe WCAG 2 A/AA scans on live `/`, `/demo`, `/privacy`, and `/terms` found no serious or critical violations.
- A fresh live phone `/demo` page reloaded offline while service-worker controlled.
- Live route statuses: root, demo, privacy, and terms 200; designed unknown route 404; checkout 303.
- Live root, worker, and manifest are byte-identical to the local implementation build.

## Limitation

An actual paid license was not issued in this workspace, so a completed Dodo purchase and returned valid token were not exercised. That external billing completion remains appropriate for authorized billing QA. The customer-facing checkout start and invalid-token path are real and passing; successful local entitlement is covered against the published verification contract.
