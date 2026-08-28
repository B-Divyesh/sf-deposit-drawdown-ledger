# Retainer Ledger — independent QA handoff

## Release status: FAIL

Candidate `01d1dabd65175bab24bfbdf478df04062af4317f` was independently verified on 2026-08-28 UTC against <https://deposit-drawdown-ledger.sociobot.in>. The deployment is byte-for-byte the candidate, but it **must not ship as an offline PWA**.

Release blockers:

1. **P0 — offline reload fails on the real `*.sociobot.in` host.** The deployed service worker returns before handling every `sociobot.in` request, including this app. With an active controller and precached shell, switching offline then reloading production produces `net::ERR_INTERNET_DISCONNECTED`.
2. **P1 — malformed-but-accepted JSON import corrupts local state.** An import missing `updatedAt` writes first, then fails during sorting; every subsequent reload opens the fatal error state with no in-product recovery.

Full exact evidence, passing checks, header/cache findings, and remediation is in [.factory/verification.md](verification.md).

## What passed

`npm ci`, `npm test` (4/4), exact `npm run build`, `npm run test:e2e` (12/12), and `npm run check` all passed from a clean candidate checkout. Live normal ledger, invalid amount/overdraw recovery, adjustments, PDF/CSV, valid JSON import, keyboard, desktop/390 px mobile, reduced motion, no serious/critical axe findings, no normal-flow console errors, and live Lighthouse (95 performance / 100 accessibility / 100 best practices / 100 SEO) passed.

## Verify after fixes

```sh
npm ci
npm run check
```

Then repeat the live HTTPS scenarios in `verification.md`, especially a controlled service-worker offline reload on `https://deposit-drawdown-ledger.sociobot.in` and a rejected malformed JSON import followed by a successful reload.
