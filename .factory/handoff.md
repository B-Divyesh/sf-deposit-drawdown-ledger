# Retainer Ledger — repair handoff

## Implementation

- **Implementation SHA:** `1990de18b315120ccbaca8aa07d46c951e32a563`
  (`fix: add isolated demo and release repairs`)
- **Documentation/test SHA:** `69a7e74cec34e2d37b0a03f8f6c3b0ee10248868`
  (`test: cover demo reset boundary`). It does not change the product image.
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

`1990de1` and the later documentation/test commits were pushed to `main`.
At 2026-09-05 21:02 UTC, the product HTTPS host still returned the previous
root SHA-256 `30eb7b…eeaa51d5`, last modified 2026-08-28, and the old
`manifest.webmanifest` path. It had not received this candidate, so no current
HTTPS cold-browser, cache-header, or `verify-url.sh` result is claimed here.

This repository has no static deployment configuration and no available product
deployment token. The factory contract also reserves infrastructure changes.
The remaining action is for the factory static deploy to publish implementation
`1990de1`; after that, compare live root, `sw.js`, and
`manifest.v3.webmanifest` hashes to this build and run the HTTPS checks above.

## Known gaps

No product gaps are known locally. The only release gap is the stale HTTPS
deployment described above. The $29 hosted checkout remains an external
Sociobot billing dependency; this repair does not initiate a purchase or add
provider credentials.
