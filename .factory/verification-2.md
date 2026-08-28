# Independent verification 2 — FAIL

**Candidate:** `28f26778151e243777e64e40e682ea0fe77838f4`  
**Live URL:** https://agent-action-receipt.sociobot.in/  
**Verified:** 2026-08-28 from a clean detached worktree  
**Decision:** **FAIL**

The candidate repairs the previously reported concurrency, durable-outbox,
response-policy, and copy-target defects, and the live files byte-match the
candidate build. It nevertheless fails the researched brief's central success
measure. A tool side effect can succeed and then be left with only a prepared
receipt—no final receipt and no explicit unresolved outbox item—when final
receipt construction fails before `tryPersistFinal()` begins.

## Release-blocking defect

### Critical — post-side-effect finalization failures bypass the outbox

`ReceiptLedger.executeInOrder()` calls `run()` and then constructs the success
receipt. Result hashing, both caller-provided redaction callbacks, and
`signer.sign()` all execute while constructing that receipt, outside the
final-write/outbox fallback. If any of them throws, the successful side effect
has only its earlier `prepared` receipt. The ledger still reports that
one-entry chain as valid.

This was reproduced through the packed package, not an internal source import:

```text
REDACTION_GAP {"effectCount":1,"entries":["prepared"],"outbox":0,
  "verify":{"ok":true,"checked":1}}
INVALID_RESULT_GAP {"effectCount":1,"entries":["prepared"],"outbox":0,
  "verify":{"ok":true,"checked":1}}
SIGNER_FINALIZATION_GAP {"effects":1,"entries":["prepared"],"outbox":0,
  "verify":{"ok":true,"checked":1}}
```

The first case uses valid JSON arguments/results and a supported
`redactResult` callback that throws `Error("redactor crashed")` after `run()`
increments the effect counter. The second returns `NaN` at runtime, exercising
invalid JavaScript consumer input. The third wraps a valid Ed25519 signer and
throws on its second signing operation, modeling an OS/KMS failure after the
effect. In all three cases the effect count is one, `entries` contains only
`prepared`, `unresolved` is empty, and `ledger.verify()` says `ok: true`.

This is the exact split-brain condition the product exists to prevent and
directly violates: “every successful side effect has either a verifiable final
receipt or an explicit unresolved outbox item.”

## Other defects

### High — dark treatment fails serious axe color contrast

At 390 px with OS dark mode and the outbox state visible, axe reported one
**serious** `color-contrast` violation across 13 nodes. Examples:

- Coral eyebrow/step text on night ink: **2.49:1**, required 4.5:1.
- Demo eyebrow on dark blue: **1.54:1**, required 4.5:1.
- Outbox verification and offline text on pale yellow: **1.07:1**, required
  4.5:1.
- Copy control text: **2.12:1**, required 4.5:1.
- The coral focus outline on dark inputs is also 2.49:1, below the 3:1 UI
  contrast requirement.

The explicit dark-theme toggle also has one serious contrast violation across
11 nodes. Light desktop and light 390 px each returned zero axe violations.

### Moderate — valid long tool names destroy the mobile layout

The normal 390 px page starts at `clientWidth = scrollWidth = 390`. Submitting
a 500-character unbroken tool name (the input has no maximum or validation)
expands the document to **5,659 CSS px** and the receipt to 5,591 px. The value
is safely rendered as text, but the result is not mobile-usable. Empty required
input correctly focuses the invalid field and recovers after a valid value.

### Moderate — service-worker updates retain and serve the old shell

The live service worker is active, `registration.update()` succeeds, and a
fresh offline reload returns 200. However, a controlled two-version test using
the exact candidate worker logic produced caches
`agent-action-receipt-sim-v1` and `agent-action-receipt-sim-v2` after update.
Because activation never deletes old caches and fetch uses global
`caches.match()`, the offline reload after the v2 worker activated still showed
the v1 title rather than `UPDATED V2`. Existing users can remain on stale
documentation after deployment.

### Low — several mobile links miss the 44 px touch target minimum

At 390 px, the wordmark is 35.6 px high and the Privacy, Terms, and Source links
are 22.3 px high. Form controls, theme control, CTAs, and copy control meet the
44 px minimum.

### Low — missing favicon creates a browser resource error

Lighthouse requested `/favicon.ico`, received 404, and failed its
`errors-in-console` audit. This is the only reason Best Practices scored 96.
Playwright recorded no JavaScript console errors, uncaught page errors, or
failed requests during its ordinary navigation path.

## Clean quality gates and package verification

The clean worktree was created directly at the candidate commit. Commands and
results:

```sh
npm ci                                      # PASS; 8 packages, 0 vulnerabilities
npm test                                    # PASS; 5/5 tests
npm run check                               # PASS
npm run lint                                # PASS
npm run build                               # PASS; dist/esm, dist/cjs, dist/site
npm run test:browser                        # PASS; 1/1 repository browser test
npm audit --omit=dev --audit-level=high     # PASS; 0 vulnerabilities
npm pack --dry-run                          # PASS
npm pack --json                             # PASS
```

The tarball is 58,488 bytes (98,585 bytes unpacked), SHA-1
`339ede426d3d1b6961f23d59d24689b408962265`. It was installed into an empty
consumer. Documented ESM use, CJS `require()`, success, failure, privacy,
tamper detection, malformed restore rejection, invalid actor/tool handling,
32 concurrent calls (64 contiguous receipts), final-write plus outbox-write
failure, and the three finalization gaps above were exercised. ESM and CJS
normal chains verified. The package has zero production dependencies and ships
its declarations, README, MIT license, and changelog.

The repaired behaviors do pass: concurrent actions serialize to sequences
1–64; a failed prepared write prevents `run()`; the repository's durable store
test restores, drains, and continues a valid chain; final append failure is
saved to a durable outbox; and failure of both final append and outbox save
throws `OutboxPersistenceError` with the signed final receipt.

## Live deployment identity, privacy, and response policy

Fresh HTTPS responses exactly match the candidate's `npm run build` output:

| File | SHA-256 |
| --- | --- |
| `index.html` | `a0f5e9d9b862d0812c56370fa7a7e14b4b31434b6ef0fb165ed08ff2d1ce3770` |
| `privacy.html` | `4daae97769749800b5285290612f67e9af4e2a9845e1a1091bd04ea6689e037e` |
| `terms.html` | `f15416f37028bc2294a8e5268fd2d6b9c694b996dceb4da1c39e00b98815c70d` |
| `sw.js` | `ab9dd0552a72b656ecda342c3e192771d4601e39ddb93da7cc991a97d2c7d031` |
| `assets/app.33df622604a9.js` | `33df622604a97e38c3b3d2c5ead4ab2906e94337c0b22a79f9a5ac09ebb75247` |
| `assets/styles.c30994913d51.css` | `c30994913d51b6a78d5f59eabfa14ad04111b178bc07e35ed1f83c5ac49dbd99` |
| `assets/receipt-diorama.79d8d1721986.webp` | `79d8d1721986cce9a883888ec4f73b29ba5a6dcf72732445dc854eb7ee9f99e7` |

`origin/main` also pointed to the candidate before this report commit. TLS 1.3
uses a certificate for `agent-action-receipt.sociobot.in` valid through
2027-02-28.

HTML and `sw.js` return `Cache-Control: no-cache`. Fingerprinted assets return
`public, max-age=31536000, immutable`; an `If-None-Match` request returned 304.
Responses include HSTS, CSP (`default-src 'self'` plus restrictive directives),
Permissions-Policy, strict referrer policy, and `nosniff`.

Fresh browser navigation made requests only to the product origin. There are
no cookies, local/session storage entries, analytics, telemetry, third-party
fonts/scripts, production dependencies, product API calls, payment calls, or
authentication. The demo retains state only in memory and HTML injection input
was rendered inert with `textContent`. Because this is a static documentation
site with no server-side/API endpoint, API burst rate-limiting and `Retry-After`
are not applicable. There is no sign-in, so the Entra authority requirement is
also not applicable.

## Browser, accessibility, and performance evidence

- Desktop 1440 px and mobile 390 × 844 success, failure, outbox, empty-state,
  required validation, recovery, keyboard submit, keyboard copy, and safe text
  injection were exercised against live production.
- Tab order reaches the skip link first and continues through navigation,
  theme, CTAs, all form controls, submit, and copy. Light-mode focus is a
  visible 4 px coral outline. There were no keyboard traps.
- Light desktop/mobile axe: 0 violations. Privacy and Terms at 390 px: 0 axe
  violations, correct title/lang, one h1, and one main.
- Reduced motion yields `0.00001s` receipt/hero animation and `scroll-behavior:
  auto`.
- Live service worker controls the page; fresh cache is
  `agent-action-receipt-dd11edb4e499`; same-version update has no waiting worker;
  fresh offline reload returns 200 with the expected page.
- Raw initial assets: JS 4,066 B, CSS 8,346 B, hero WebP 38,790 B; no fonts.
  These are comfortably inside the 200/50/300 KB budgets.
- Lighthouse 12.8.2 mobile live run: Performance **96**, Accessibility **100**
  (light mode), Best Practices **96**, SEO **100**; FCP 0.962 s, LCP 1.286 s,
  CLS 0.0249, Speed Index 1.200 s, 46,414 B across four first-party page
  resources. INP is not available from a navigation-only lab run. The favicon
  404 described above is the failed Best Practices audit.

## Required before re-verification

1. Guarantee an explicit recoverable record for every failure after `run()`
   succeeds, including redaction, result serialization/hashing, and signing;
   add fault-injection regressions through the public packed API.
2. Correct contrast and focus colors for both automatic and explicit dark
   treatments, then run axe in both color schemes with every demo state.
3. Constrain or wrap long receipt tool labels so the 390 px layout remains
   within the viewport.
4. Delete superseded service-worker caches during activation and scope cache
   lookup to the current cache; test a real v1-to-v2 update and offline reload.
5. Bring all mobile targets to 44 × 44 CSS px and provide a valid favicon (or
   explicitly suppress the automatic request), then rerun Lighthouse.
