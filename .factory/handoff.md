# Retainer Ledger handoff

## Current verification result

**FAIL — 1 P2 finding, 0 untested claims.**

The product behavior is working, but the root page does not include the mandatory **How it works**, **What it does not do / privacy**, and full visible **paid tier** sections required by the supplied site-structure contract. See `.factory/verification-4.md`.

## Product

- **Job:** Record deposit requests, payments, approved drawdowns, adjustments, and the remaining deposit; share a client statement.
- **Audience:** Independent consultants and tradespeople who take deposits or retainers.
- **First action:** **Try it with sample data**. It opens the populated Elm Street kitchen joinery ledger.
- **Implementation SHA:** `1990de18b315120ccbaca8aa07d46c951e32a563`.
- **Checkout-test SHA:** `155d4986e1d453866a59e033ccf37b8c093a652c`.
- **Documentation checkout reviewed:** `feee059e0bac4dcff818a15375bdff8416703234`.

Later commits through the reviewed documentation checkout change tests and reports, not shipped client assets. Live root, worker, and manifest bytes match the local implementation build.

## What passed

- Clean `npm ci`: 68 packages, 0 vulnerabilities.
- `npm test`: 4 passed.
- `npm run build`: passed; `dist/` produced at 59.83 KB HTML, 18.28 KB gzip.
- `npm run test:e2e`: 54 passed, 2 intentional project-specific skips.
- `npm run check`: passed.
- All 16 declared claim commands passed separately in desktop and phone projects.
- Fresh desktop and phone first screens showed the job, audience, and sample action before scrolling.
- Demo seed, persistent label, realistic totals, demo-only write, reset, exit, and real-data isolation passed in both profiles.
- Real normal, invalid, boundary, persistence, PDF, CSV, JSON backup, malformed-import, and damaged-data recovery paths passed.
- Live controlled offline reload passed. The two-version update regression passed locally.
- Live $29 checkout returned 303 to Dodo and the hosted page returned 200. Real invalid-license validation returned `valid: false`, reason `invalid`. Recorded valid-response behavior enabled multiple jobs, custom PDF branding, and offline paid state.
- Root, demo, privacy, and terms returned 200; the designed unknown route intentionally returned 404. Link crawl and route titles passed.
- Axe found no WCAG 2 A/AA violations on root, demo, privacy, terms, or 404. Keyboard focus, dialog focus/Escape, reduced motion, 44 px targets, and phone overflow passed.
- Lighthouse mobile scored 100 in Performance, Accessibility, Best Practices, and SEO. LCP was 1.2 s, TBT 0 ms, and CLS 0.
- CSP, Permissions-Policy, frame denial, nosniff, referrer policy, HSTS, immutable versioned caching, and PWA manifest checks passed.

## Required next step

Add the three missing landing sections after the live product area:

1. A three-step **How it works** section.
2. A plain privacy/non-goals section.
3. A visible $29 one-time paid section naming unlimited jobs and custom PDF branding.

Keep the current app-first first screen and do not remove or alter the registered paid deliverables. After repair, rerun all claim commands, `npm run check`, live first-screen and link checks, checkout/invalid-license checks, Axe, Lighthouse, and deployment hash comparison.

## Known limitation

No authorized completed purchase or issued customer license was available. Final Dodo token delivery was not exercised. No payment was submitted and no credential was invented.

## Run locally

```sh
npm ci
npm run dev
```

Run all gates with `npm run check`. Build deployment output with `npm run build`; deploy `dist/` through the existing factory workflow. No backend, database, secrets, DNS, billing, or infrastructure changes were made.
