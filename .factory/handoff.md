# Retainer Ledger — repair handoff

## Implementation

- **Implementation SHA:** `1990de18b315120ccbaca8aa07d46c951e32a563`
  (`fix: add isolated demo and release repairs`)
- **Documentation/test implementation SHA:**
  `69a7e74cec34e2d37b0a03f8f6c3b0ee10248868`
  (`test: cover demo reset boundary`). It does not change the product image.
- **Verification documentation SHA:**
  `f2e1405f8c10b799c273b6a9fb2d6b76f03220c7`
  (`docs: record pending static deployment`). It does not change the product image.
- **Product:** record deposits, payments, approved drawdowns, and the remaining
  balance for one job; share a statement with the client.
- **Audience:** independent consultants and tradespeople who take deposits or
  retainers.
- **First action:** **Try it with sample data** on the first screen. It opens a
  populated Elm Street kitchen joinery ledger.

## Repairs completed

1. Added `/demo`, a one-click seeded sample in IndexedDB
   `demo:retainer-ledger-v1`. The persistent banner has Reset demo and Start
   for real controls. Demo mode cannot read or write the real database; leaving
   discards the demo. See `.factory/demo.md`.
2. Added `.factory/claims.json` with 16 public claim bundles and one tagged,
   outcome-based Playwright test for each. All begin at `/demo`; privacy claims
   log outgoing requests. Every declared individual command passed from the
   documented clean setup.
3. Fixed **Update now** to message `registration.waiting`, handle a missing
   waiting worker, and reload on `controllerchange`. A two-version browser
   regression proves the waiting worker activates, the client reloads, and old
   caches are removed.
4. Raised global phone targets to at least 44 × 44 px and added a 390 px
   measurement test for Home, nav, Data, Privacy, and Terms.
5. Versioned all deployed icons, manifest, and hero assets with `.v3` names;
   only those versioned assets receive a one-year immutable cache header. The
   worker and HTML stay revalidatable.
6. Added static `/demo`, `/privacy`, and `/terms` entries, a designed 404,
   sitemap, robots sitemap reference, canonical URL, Open Graph/Twitter image,
   Apple touch icon, and route-specific titles. Removed the catch-all static
   navigation fallback so unknown hosted paths reach the designed 404.
7. Rewrote the first screen in plain words, added the required copy audit, and
   added the verb-first catalog description at `.factory/catalog-description.txt`
   (also copied to `/work/.evidence/catalog-description.txt`).

## Earlier finding disposition

| Finding | Status | Current evidence |
| --- | --- | --- |
| Production offline reload | Remains fixed | `@claim:offline-reload` uses its own fresh context, waits for worker control, goes offline, and reloads `/demo`. |
| Malformed import could corrupt data | Remains fixed | Existing browser test rejects malformed backup atomically; recovery test covers damaged storage. |
| Update now targeted active worker | Fixed | Two-version worker regression passes. |
| Four undersized mobile targets | Fixed | 390 px bounding-box regression passes. |
| Unversioned immutable assets | Fixed | `.v3` assets and scoped immutable headers are in `staticwebapp.config.json`. |
| Missing discovery/404/metadata | Fixed | Static routes, `404.html`, sitemap, canonical/social metadata, and route titles ship in `dist/`. |
| First-screen plain wording/demo CTA | Fixed | First screen names the job, audience, sample action, and three factual lines. |

## Verification

From a clean dependency install (`npm ci`, 0 vulnerabilities):

```sh
npm test
npm run build
npm run test:e2e
npm run check
```

- `npm test`: 4 passed.
- `npm run build`: passed; `dist/` has the root, demo, privacy, terms, PWA
  files, sitemap, and 404 page. Inline initial HTML is 59.83 KB (18.28 KB gzip).
  The mobile AVIF is 20 KB; no font payload is shipped.
- `npm run test:e2e`: 54 passed, 2 deliberately project-scoped checks skipped
  (the desktop two-version worker test and mobile-only target measurement).
- `npm run check`: passed with the same results.
- All 16 commands declared in `.factory/claims.json` were each executed
  separately and passed in both desktop and phone projects.

## Deployment and live check

The static host published the repaired candidate after this handoff was first
written. Independent verification on 2026-09-05 found matching SHA-256 values
for live `/`, `/sw.js`, and `/manifest.v3.webmanifest` and the fresh local
build. Live cold-browser, cache-header, service-worker offline, URL verifier,
and Axe integration checks are recorded in `.factory/verification-3.md`.

## Known gaps

### Independent verification 3 — FAIL

Verification on 2026-09-05 reviewed implementation
`1990de18b315120ccbaca8aa07d46c951e32a563` and documentation/test checkout
`f2e1405f8c10b799c273b6a9fb2d6b76f03220c7`.

The live host now exactly matches the repaired local build, including `/demo`,
offline reload, the worker-update repair, 44 px phone targets, versioned asset
caching, metadata, and the designed 404. A clean `npm ci` then all 16 declared
claim commands, `npm test`, `npm run build`, `npm run test:e2e`, and
`npm run check` passed (54 browser passes and 2 intentional project-scoped
skips). The current verification report is `.factory/verification-3.md`.

The release cannot be accepted yet. The visible $29 **Buy the one-time unlock**
link resolves to the product's Sociobot checkout URL, which returns HTTP 404.
This makes the paid user path unavailable and leaves the paid claim's
checkout-start coverage incomplete. Factory billing registration must be
restored, then the live link crawl and checkout-start smoke test rerun. No
product code, deployment configuration, or credentials were changed by this
verification.
