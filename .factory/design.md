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

Light and dark treatments share those materials. The final dark ground is
`#111B23`, dark paper is `#21343F`, dark text is `#FFF9ED`, dark supporting
text is `#D2DDE0`, and dark coral is `#FF9C88`. Dark focus uses `#FFD166`.
These separate dark tokens keep text at least 4.5:1 and controls at least 3:1.
Spacing follows an 8px rhythm, with generous 24–64px paper
layers. The typography pairs the self-host-free system serif `Georgia` for
evidence headings with an OS monospace stack for hashes and payloads; this is
deliberately utilitarian and avoids network font loading.

## Interaction and motion

Receipt cards lift by 2px on hover and focus; the demo adds receipt strips in
sequence over 180ms, like a slip being filed. The illustration has one gentle
initial settling motion. Under `prefers-reduced-motion: reduce`, all movement
is removed and state changes use immediate color/opacity only. Keyboard focus
uses a thick coral outline.

Mobile puts the explanatory copy below the diorama and makes the demo a single
column. Every control has a 44px target. Receipt labels wrap inside their paper
layer instead of widening the viewport.

## Original asset plan and provenance

`public/receipt-diorama.webp` is an original generated raster illustration.
It uses a paper-cut editorial scene with no text, marks, or third-party brand
assets, generated for this project with `/opt/fleet/lib/gen-image.sh` using the
factory-image deployment. The final asset is converted to WebP and kept below
300 KB. Its source prompt is recorded in `README.md` and this file is its
provenance record. `public/og-receipt.png` is a 1200×630 crop of that original
asset, made locally with ImageMagick.

`public/favicon.svg` is an original hand-authored receipt-and-seal mark. The
ICO and Apple touch variants were rendered locally with ImageMagick. CSS
supplies other small marks so they remain crisp and accessible.
