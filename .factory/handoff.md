# Retainer Ledger — review handoff

## Release status: FAIL

Review 1 on 2026-09-05 tested implementation
`0e2804745b25bd05ff0b8899da79fe48bcc62b5d` against
<https://deposit-drawdown-ledger.sociobot.in>. The checkout documentation SHA
was `78a61ea52d5342ab16ea994d3b665449e897a1a5`; later commits only changed
reports. Live root, service worker, and manifest hashes match the local build.

The full result is in [`.factory/review-1.md`](review-1.md). It has **7
findings and 15 untested public claim bundles**. Do not release this version.

## What was verified

- `npm ci` completed with 0 vulnerabilities; `npm test` (4/4), `npm run build`,
  `npm run test:e2e` (18/18), and `npm run check` passed.
- Fresh desktop and phone browser checks covered a normal ledger, invalid and
  overdraw paths, reload persistence, PDF/CSV export, malformed import,
  corrupt-data recovery, keyboard focus, 390 px layout, reduced motion, legal
  pages, privacy request origins, live offline reload, and axe serious/critical
  checks.
- `/opt/fleet/lib/verify-url.sh` passed on the live URL. No console errors were
  observed in fresh live loads.

## Known gaps and next steps

1. Build the required separate, seeded sample sandbox and add `.factory/demo.md`.
2. Add `.factory/claims.json` and a passing demo-based `@claim:` test for every
   public claim; add the missing copy audit.
3. Fix **Update now** to post `SKIP_WAITING` to `registration.waiting`, then
   prove a true two-version worker update.
4. Increase the four undersized phone targets; version static assets before
   immutable caching; add a designed 404, sitemap, canonical/social metadata,
   and the missing first-screen plain-language job and audience copy.

## Re-run

```sh
npm ci
npm run check
/opt/fleet/lib/verify-url.sh https://deposit-drawdown-ledger.sociobot.in <evidence-dir>
```

After repairs, run every declared claim command from a new browser context using
only the demo entry point, plus the real two-version PWA update test.
