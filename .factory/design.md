# Agent Action Receipt — visual thesis

## Direction: paper-cut diorama

Audit evidence should feel physical: an action passes through distinct, visible
layers before it becomes a receipt someone can check. The landing page uses a
quiet paper-cut diorama of a sealed action card, a redacted layer, a witness
stamp, and a linked receipt strip. It explains the protocol without suggesting
that logging alone is proof.

## Tokens

| Token | Value | Purpose |
| --- | --- | --- |
| night ink | `#17232D` | primary text and dark-mode ground |
| receipt paper | `#FFF9ED` | warm light background |
| ledger green | `#16695A` | primary action / verified state |
| witness coral | `#A43D2E` | hashes, warnings, receipt seal |
| cut blue | `#D8E7ED` | recessed paper layer |
| graphite | `#52616A` | supporting text |
| pollen | `#E8B94F` | caution / unresolved outbox |

Light and dark treatments share those materials: dark mode changes the ground
to night ink and turns papers into `#223540`; all body text remains at least
4.5:1 contrast. Spacing follows an 8px rhythm, with generous 24–64px paper
layers. The typography pairs the self-host-free system serif `Georgia` for
evidence headings with an OS monospace stack for hashes and payloads; this is
deliberately utilitarian and avoids network font loading.

## Interaction and motion

Receipt cards lift by 2px on hover and focus; the demo adds receipt strips in
sequence over 180ms, like a slip being filed. The illustration has one gentle
initial settling motion. Under `prefers-reduced-motion: reduce`, all movement
is removed and state changes use immediate color/opacity only. Keyboard focus
uses a thick coral outline.

Mobile stacks the description above the diorama and keeps the demo controls
large and single-column; the reference table becomes horizontally scrollable.

## Original asset plan and provenance

`public/receipt-diorama.webp` is an original generated raster illustration.
It uses a paper-cut editorial scene with no text, marks, or third-party brand
assets, generated for this project with `/opt/fleet/lib/gen-image.sh` using the
factory-image deployment. The final asset is converted to WebP and kept below
300 KB. Its source prompt is recorded in `README.md` and this file is its
provenance record. CSS supplies the small UI icons so they remain crisp and
accessible.
