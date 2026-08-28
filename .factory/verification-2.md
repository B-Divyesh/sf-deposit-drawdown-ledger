# Independent verification 2 — FAIL

**Verifier:** factory QA

**Date:** 2026-08-28 UTC

**Candidate:** `f0e2d4b0d2981101eaea59537c37a6f33dbd635d`

**Production URL:** <https://deposit-drawdown-ledger.sociobot.in>

## Verdict

**FAIL — do not promote this candidate.** The prior production-offline and
malformed-import blockers are repaired, and the live deployment matches this
candidate, but a fresh two-version test found that the visible PWA update action
cannot activate a waiting service worker.

## Blocking defect

### P1 — “Update now” sends the command to the wrong service worker

The production build displays an update toast when a second worker reaches the
`installed`/waiting state. Pressing **Update now** does not activate it.

Fresh reproduction against the exact `dist/` build, using a localhost origin
and two in-memory versions of the candidate worker:

1. Served worker/cache version `qa-a`, waited for it to activate and control the
   page, then reloaded so the app started with an existing controller.
2. Served byte-different version `qa-b`, called `registration.update()`, and
   observed the visible “A fresh version is ready” toast.
3. Before the click: active worker `activated`, new worker `waiting: installed`;
   caches contained old `qa-a` shell/runtime and the installed `qa-b` shell.
4. Pressed **Update now** and waited 750 ms. State was unchanged: the new worker
   remained `waiting: installed`, the old worker remained active, both old
   caches remained, the toast remained visible, and the page did not reload.
5. Control check: posting the same `{ type: "SKIP_WAITING" }` message directly
   to `registration.waiting` immediately activated `qa-b`, reloaded the client,
   hid the toast, and removed the `qa-a` caches.

Cause: the click handler in `src/main.ts` posts to
`navigator.serviceWorker.controller`, which is the old active worker. The
`SKIP_WAITING` message must be sent to the registration's waiting worker. An
installed app can therefore advertise an update that its action does not apply;
the browser will only advance after all old controlled clients close. This
violates the PWA update requirement and can strand long-running installed
clients on stale code.

Required fix: retain/access the registration and post to
`registration.waiting`, handle a missing/racing waiting worker, and add a
two-version browser regression test that asserts controller change, reload, and
old-cache removal.

## Non-blocking defects

### P2 — four mobile targets are smaller than 44 × 44 CSS px

At a 390 × 844 touch viewport the visible targets measured:

| Target | Measured size |
| --- | ---: |
| Home brand | 42 × 42 px |
| Data and backups | 42 × 44 px |
| Privacy | 42.6 × 19.5 px |
| Terms | 35.4 × 19.5 px |

This misses the attached accessibility/design requirement even though axe does
not flag it. Increase the interactive boxes, not only the visual marks/text.

### P2 — static assets do not use long-lived immutable caching

The root, worker, manifest, icons, and checked image all return
`Cache-Control: public, must-revalidate, max-age=30`. The public asset names are
not content-hashed, so this is safe for updates but does not meet the stated
versioned, long-lived immutable asset policy. Version asset filenames before
adding immutable caching. The worker's own cache name is versioned.

## Passing evidence

### Clean install, tests, type checking, and production build

- Started with a clean worktree at the requested SHA, already synchronized with
  `origin/main`.
- `npm ci`: 68 packages installed, **0 vulnerabilities**.
- `npm test`: **4/4** Vitest tests passed.
- `npx tsc --noEmit`: passed. There is no separate lint script.
- `npm run build`: passed TypeScript checking, Vite production build, and static
  route generation; `dist/` contains the root, `/privacy`, `/terms`, worker,
  offline fallback, manifest, and icons.
- `npm run test:e2e`: **18/18** tests passed across desktop Chromium and the
  configured 390 × 844 mobile project.
- `npm run check`: independently reran the aggregate gate successfully: 4/4
  unit tests, exact build, and 18/18 browser tests.

Build budgets pass. `dist/index.html` is 53,185 B (16.75 kB gzip), containing
36,754 B inline JavaScript and 15,720 B inline CSS. There is no font payload.
The mobile AVIF is 17,543 B. These are below the 200 KB JS, 50 KB CSS, 120 KB
font, and 300 KB mobile-image budgets.

### Live deployment identity

Fresh live bytes match the candidate build exactly:

| Resource | SHA-256 |
| --- | --- |
| `/`, `/index.html`, `/privacy`, `/terms` | `30eb7b3351da91e639d5cd1c6ec9987bab44d503a4113f14e218d991eeaa51d5` |
| `/sw.js` | `fdfb9019c521dfc3b420c3650e854f005ff9619a9feb047fed5cd7de76fec8f9` |
| `/manifest.webmanifest` | `975efd6edcf96502e8f1e7eac8adbb6fd2808084b990d3f2b479c0e669a5365d` |
| `/offline.html` | `9479cd6404af9a97c768f0549fe0d59ca02c2cf1b2af24af5f3b3b3db9219dda` |
| `/assets/hero-night-ledger-480.avif` | `30399b8d3a627f7cf4d586619f9cfbf006ea2c244a522dcb1aaea61da4163b9d` |
| `/icon.svg` | `ba98036f1e8452191d9e9f2fee2a6dd9ae7f41c9c70ddfaa33223289c4a87014` |

### Real job flow, boundaries, exports, and recovery

On live HTTPS in a fresh profile:

- Created a `$1,000.00` request and confirmed a request does not increase money
  held. Recorded `$750.00` received, a separate `$250.00` additional request,
  and a `$250.00` approved drawdown; remaining balance was `$500.00`.
- Rejected zero and three-decimal deposit amounts, a negative normal payment,
  and a `$500.01` overdraw against `$500.00`, with actionable messages and no
  unwanted records.
- Added immutable `-$600.00` and `+$100.00` adjustments. The temporary
  `-$100.00` state showed the explicit overdraw warning, and the final balance
  reconciled to `$0.00`. Six append-only rows persisted after reload; no
  edit/delete affordance exists.
- HTML-like names/descriptions rendered as text. A spreadsheet-formula-leading
  description was apostrophe-prefixed in CSV. The CSV contained the header plus
  all six records.
- The PDF had the expected filename, `%PDF-1.4` header, one page, and an ISO
  generated-at timestamp. JSON backup contained one job and all six records.
- A valid backup restored into a clean profile. Invalid JSON, a backup missing
  `updatedAt`, and an orphan record were rejected without changing IndexedDB;
  reload remained usable.
- Deliberately corrupt stored data produced the recovery screen. The recovery
  download contained the damaged job, and confirmed clear returned to a usable
  empty ledger.
- A second free job opened the clear `$29 one time` unlock sheet rather than
  bypassing the license boundary.

### Offline, privacy, accessibility, and browser quality

- Live worker controlled the page with cache
  `retainer-ledger-v1.0.1-shell`. A `$0.01` job/payment survived an offline
  reload with the `$0.01` balance and visible **Offline** indicator.
- A same-version live `registration.update()` completed without disrupting the
  active worker; the failing real second-version path is documented above.
- A fresh unlicensed load requested only the product origin. No analytics,
  trackers, remote fonts, CDN scripts, or ledger-data requests were observed.
- A mocked license-return flow made one request to the correct Sociobot verify
  path with only the `license` query key, stored the token locally, stripped it
  from the address bar, and unlocked without sending ledger data.
- Production serves CSP, Permissions-Policy, `X-Frame-Options: DENY`, HSTS,
  `X-Content-Type-Options: nosniff`, and strict referrer policy.
- Axe WCAG 2 A/AA scans found **0 serious/critical** issues in desktop empty and
  populated states, 390 px mobile, `/privacy`, and `/terms`.
- `lang=en`, title, one `h1`, one `main`, labeled controls, and descriptive image
  alt text are present. The hero decoded successfully.
- Keyboard-only: first Tab reveals `Skip to ledger` with a cyan 3 px outline;
  the primary action opens with Enter; the native dialog moves focus to its
  labeled close control and closes with Escape.
- At 390 px, `scrollWidth = clientWidth = 390`. Reduced motion changes the
  transition duration to `0.00001s`. Console/page errors were empty.
- Factory `verify-url.sh` passed in 714 ms with no console errors.
- Fresh mobile Lighthouse: Performance **100**, Accessibility **100**, Best
  Practices **100**, SEO **100**; FCP **1.0 s**, LCP **1.2 s**, TBT **0 ms**,
  CLS **0**, total transfer **69 KiB**.

## Release gate

Fix and regression-test the P1 waiting-worker target, then rerun the update
simulation, repository gates, deployment identity check, offline reload, and
live smoke tests. The touch-target and immutable-caching P2s should also be
scheduled; neither is the reason for the FAIL verdict.
