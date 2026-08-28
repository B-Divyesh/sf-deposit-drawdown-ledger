# Retainer Ledger — independent QA handoff

## Release status: FAIL

Candidate `f0e2d4b0d2981101eaea59537c37a6f33dbd635d` was independently tested on
2026-08-28 against <https://deposit-drawdown-ledger.sociobot.in>. Production
bytes match the candidate build exactly. Do not promote this candidate because
the PWA's visible **Update now** action cannot activate its waiting worker.

Full evidence: [`.factory/verification-2.md`](verification-2.md).

## Blocking defect

**P1 — broken PWA update action.** A controlled two-version test reached the
intended waiting-worker state and displayed the update toast. Pressing **Update
now** left the new worker waiting and the old worker active. The handler posts
`SKIP_WAITING` to `navigator.serviceWorker.controller` (the old active worker),
not `registration.waiting`. A control message sent directly to the waiting
worker activated it, reloaded the page, and removed the old caches.

Required next step: message `registration.waiting`, handle worker races, and add
a two-version browser test that proves controller change, reload, and old-cache
cleanup.

## Other defects

- **P2 accessibility:** at 390 px, Home is 42 × 42, Data is 42 × 44, Privacy is
  42.6 × 19.5, and Terms is 35.4 × 19.5 CSS px; all miss the 44 × 44 target.
- **P2 caching:** checked static assets use
  `public, must-revalidate, max-age=30`, not content-versioned immutable caching.

## Verification summary

- `npm ci`: 0 vulnerabilities.
- `npm test`: 4/4 passed.
- Explicit TypeScript check and `npm run build`: passed; `dist/` produced.
- `npm run test:e2e`: 18/18 desktop/mobile tests passed.
- `npm run check`: passed the complete aggregate gate again.
- Live normal, boundary, invalid/recovery, persistence, PDF, CSV, JSON backup,
  atomic import, corruption recovery, privacy, license, keyboard, 390 px,
  reduced-motion, offline-data reload, and policy checks otherwise passed.
- Live axe serious/critical findings: 0 across empty, populated, mobile, privacy,
  and terms states. Console/page errors: 0.
- Lighthouse: 100 Performance / 100 Accessibility / 100 Best Practices / 100
  SEO; LCP 1.2 s, TBT 0 ms, CLS 0, 69 KiB transfer.
- Bundle budgets pass: inline JS 36,754 B; inline CSS 15,720 B; no fonts; mobile
  hero 17,543 B.
- Root, worker, manifest, offline page, legal routes, icon, and mobile hero all
  hash-match the fresh local candidate build.

## Re-run

```sh
npm ci
npm run check
/opt/fleet/lib/verify-url.sh https://deposit-drawdown-ledger.sociobot.in <evidence-dir>
```

After fixing the blocker, additionally rerun a genuine two-version service
worker update; same-version `registration.update()` and offline reload alone do
not exercise this failure.
