# Retainer Ledger visual thesis

## Direction: the honest neon counter

Retainer Ledger borrows the visual language of a night-market bookkeeper: a small counter under rain-dark awnings where every transaction is written clearly, date-stamped, and handed back as a receipt. Neon is used as wayfinding, not spectacle. Cyan marks money held, warm amber marks work drawn down, and paper-white surfaces carry the record. The result should feel memorable enough to share with a client while remaining sober enough to trust.

This is an intentionally single-mode dark product. The night-market direction depends on a painted deep-ink background; high-contrast paper panels supply the reading surface for dense records and exported statements.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `--ink-950` | `#080A12` | Painted night background |
| `--ink-900` | `#10131F` | Main surface |
| `--ink-800` | `#181C2B` | Raised controls |
| `--paper` | `#F4F0E6` | Statement surface and primary text |
| `--paper-muted` | `#BDB9AE` | Secondary text (7.7:1 on ink) |
| `--cyan` | `#53F3D0` | Deposits, focus, primary action |
| `--cyan-ink` | `#05251F` | Text on cyan |
| `--amber` | `#FFBF5B` | Drawdowns and attention |
| `--red` | `#FF6B79` | Errors and negative corrections |
| `--green` | `#7EE7A5` | Reconciled/success state |

Color never acts alone: every state has a label, sign, or icon. Contrast is designed for WCAG AA at normal text sizes.

## Type

- Interface and reading: `Inter Tight`-like system stack (`Avenir Next`, `Segoe UI`, sans-serif) to avoid a font payload and keep the utility offline-fast.
- Ledger numbers and micro-labels: `IBM Plex Mono`-like system monospace stack (`SFMono-Regular`, `Consolas`, monospace). Tabular figures make balances auditable at a glance.
- Scale: 14 / 16 / 20 / 28 / clamp(36–56) px. Body never drops below 16 px.

## Space, shape, and depth

An 8 px base rhythm governs spacing, with 4 px only for tight label relationships. Desktop uses a 280 px job rail beside the working ledger; at 390 px it becomes a compact job switcher and every two-column form stacks. Corners are clipped or modest (6–16 px), echoing receipt paper rather than generic pill UI. Cyan edge-light and a fine dot texture create depth; shadows stay black and directional like objects on a market counter.

Independent ledgers may use bounded panels. Transaction rows are grouped by proximity and separators, not nested cards. Every touch target is at least 44 px.

## Interaction grammar

- Primary action: solid cyan rectangular control with a small directional arrow.
- Money-in entries carry a `+` sign and cyan edge marker; drawdowns carry a `−` sign and amber edge marker.
- Records are append-only. Corrections open a focused dialog and become their own dated ledger line; there is no edit/delete affordance.
- Balance changes use a 180 ms opacity/translate transition that originates at the amount. Dialogs rise 8 px from the counter plane. With `prefers-reduced-motion`, transforms and smooth scrolling are removed and changes are immediate.
- Offline and update states appear as small fixed counter tickets with plain-language actions.

## Original asset plan and provenance

The hero/empty-state image is a stylized editorial still life: a rain-dark night-market bookkeeping counter, a blank paper ledger, translucent cyan and amber acrylic tokens, and a glowing calculator silhouette. It explains the product's deposit-to-work metaphor without depicting capabilities the app does not have.

Prompt sheet:

> Use case: stylized-concept. Asset type: responsive product hero and empty-state illustration. Primary request: an editorial still life of a meticulous night-market bookkeeper's counter after dusk, with one blank cream ledger sheet, tidy stacks of translucent cyan deposit tokens moving into warm amber work tokens, a simple calculator silhouette, rain-specked dark lacquer, and small practical lamps. Scene/backdrop: compact street-market stall, deep ink surroundings. Style/medium: tactile miniature set photography with subtle risograph grain, believable paper and acrylic materials. Composition: wide 3:2, central ledger, clear quiet perimeter for cropping, no people. Lighting: restrained cyan and amber neon edge light, trustworthy and calm rather than cyberpunk. Palette: midnight ink, paper cream, electric mint-cyan, market amber. Constraints: no readable text, no numbers, no logos, no brands, no watermark, no UI screenshot, no currency symbols, no extra hands. Avoid: generic gradient, purple tech aesthetic, excessive glow, illegible pseudo-writing, clutter, futuristic holograms.

Generation: Azure AI Foundry factory image deployment via `/opt/fleet/lib/gen-image.sh`, 2026-08-28. Generated imagery is original to this product. The selected source and exact prompt live in `assets/src/hero-night-ledger-v2.{png,json}`; responsive AVIF, WebP, and JPEG derivatives ship locally. The first candidate remains in `assets/src/` as provenance but was rejected because a calculator introduced tiny keypad numerals. Candidate v2 was reviewed at full resolution: the paper and tally slots are blank, with no text, logos, people, seams, or unintended symbols. Hand-authored SVG icons and PWA marks are MIT-licensed with the repository.

The current shipped derivatives carry a `.v3` filename so they can be cached
immutably: the four responsive hero formats, the three PWA icons, and the
`1200 × 630` `retainer-ledger-social.v3.jpg` social preview. The social preview
is a 2026-09-05 center crop and resize of the reviewed v2 source; it introduces
no new generated content. It was checked for text, logos, people, seams, and
unintended symbols before shipping.

## Responsive and performance policy

The phone version drops decorative rail copy, stacks the job identity above the balance, and makes the primary add-record button full-width. The hero is shown only in the no-job state and is supplied as 480/960 px WebP sources with explicit dimensions. The mobile source must remain under 300 KB. Initial JS is capped at 200 KB and CSS at 50 KB; there are no runtime fonts, scripts, trackers, or CDNs.
