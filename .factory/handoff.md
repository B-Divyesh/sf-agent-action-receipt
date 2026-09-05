# Repair handoff — Agent Action Receipt

## Status

FAIL in strict review 1. Version `0.1.2` passes every declared command, but the
current review found four defects. The most important is a post-effect
`redactResult` accessor failure that leaves only a prepared receipt and no
outbox evidence. See `.factory/review-1.md`.

The current site is live at https://agent-action-receipt.sociobot.in. The latest deployment ID is `ac08934d-8643-455b-908f-c57c95f00b02`.

- Deployed implementation SHA: `b037aaf461672ba2579fd77bd1df1e705bbbed5a`
- Additional regression-only SHA: `9e73d22a418b33dfd346cacd2c15163e124b877d`
- This handoff is a later documentation-only change. It does not alter the deployed artifact.

## Critical receipt repair

`ReceiptLedger.execute()` now signs an unresolved fallback before the tool can run.

- A signer failure before that fallback exists prevents `run()`.
- Argument redaction runs before `run()`, so its failure prevents the side effect.
- A result-redaction failure omits only the optional view. The signed success receipt remains valid, and `redactionWarnings` reports the omission.
- Invalid result hashing or final signing after `run()` appends the pre-signed `unresolved` receipt.
- If that append fails, the fallback is saved through the durable outbox contract.
- If both receipt and outbox persistence fail, `ReceiptFinalizationError.persistenceError` exposes an `OutboxPersistenceError` and its signed fallback for operator reconciliation.
- A restored ledger verifies and drains a persisted fallback after restart.

The public packed-package test covers a throwing result redactor, runtime `NaN`, and a signer that fails after the side effect. The unit fault matrix also covers argument redaction, failure signing after a partial effect, fallback append failure, restart recovery, and total persistence failure.

## Current and earlier findings

| Finding | Disposition | Outcome evidence |
| --- | --- | --- |
| Post-effect hashing, redaction, or signing can leave only `prepared` | Fixed | The tool is prevented before fallback signing, or a verifiable `succeeded`/`unresolved` receipt or durable outbox item exists. |
| Concurrent calls corrupt a ledger chain | Preserved fixed | Eight concurrent calls create 16 contiguous, verified receipts. |
| Outbox does not survive restart | Preserved fixed | Both a normal final receipt and the new finalization fallback restore and drain from a durable test store. |
| Dark-mode contrast failures | Fixed | Playwright axe reports zero violations in automatic dark, explicit dark, and the visible outbox state. |
| A 500-character tool name widens the mobile page | Fixed | User entry is limited to 120 characters, rendered labels wrap, and the 390px page remains 390px wide. |
| Updated workers serve an old shell | Fixed | A real controlled v1-to-v2 browser test deletes v1 and reloads the v2 title offline. |
| Wordmark and footer targets are under 44px | Fixed | Every visible mobile link, button, input, and select measures at least 44×44px. |
| Missing favicon causes a browser error | Fixed | SVG, ICO, and Apple touch icons return 200; live Lighthouse reports no console error. |
| Missing response policy and immutable assets | Preserved fixed | Live HTML has CSP, Permissions-Policy, nosniff, and no-cache. Fingerprinted assets have one-year immutable caching. |
| Copy control is under 44px | Preserved fixed | Browser measurement is at least 44px high. |

## Demo and site

The first screen states the job, audience, and first action without scrolling:

- Job: “Record every consequential agent action”
- Audience: teams giving agents real tool access
- First action: “Try it with sample data”

`/demo` opens a populated `billing.refund` receipt chain in one click. Its banner always says “Demo — sample data, nothing is saved.” Reset restores two seed records, and “Start for real” opens installation instructions.

The sample uses page memory only. Fresh desktop and phone checks found zero local or session storage entries and only same-origin requests.

The site now includes extensionless `/demo`, `/privacy`, and `/terms` routes, route-specific titles, canonical and social metadata, `robots.txt`, `sitemap.xml`, a designed 404 response, and consistent headers and footers. The GitHub source link returns 200.

## Clean verification

Run from a clean checkout:

```sh
npm ci
npm test
npm run check
npm run lint
npm run build
npm run test:consumer
npm run test:browser
npm run test:claims
npm audit --omit=dev --audit-level=high
npm pack --dry-run
```

Results on 2026-09-05:

- `npm ci`: 8 packages, 0 vulnerabilities.
- `npm test`: 14 passing tests and subtests.
- `npm run check` and `npm run lint`: pass.
- `npm run build`: writes ESM, CommonJS, declarations, and `dist/site`.
- `npm run test:consumer`: the packed artifact installs and runs through ESM and CommonJS in an empty project.
- `npm run test:browser`: 4 passing browser tests across routes, demo states, accessibility, offline reload, and worker update.
- `npm run test:claims`: all eight commands in `.factory/claims.json` pass independently.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `npm pack --dry-run`: 241,687 bytes packed, 319,292 bytes unpacked, 24 files, no bundled dependencies.

The packed artifact SHA-1 is `735a0e8927065f18a6c6320dd0932fb135d9f7d7`. It includes ESM, CommonJS, declarations, README, changelog, and MIT license.

The factory URL verifier passes locally and live with a title, `lang`, one h1, main landmark, image alt text, labelled controls, and no console errors.

## Browser, accessibility, and performance

- Fresh live desktop: 1440px page width, zero axe violations, zero console errors.
- Fresh live phone: 390px page and viewport widths, zero axe violations, zero console errors, all touch targets at least 44px.
- Live Privacy, Terms, and designed 404 pages: zero axe violations at 390px in dark mode.
- Keyboard: the skip link is first, native required validation focuses the tool field, and all controls are operable.
- Reduced motion: receipt motion is effectively disabled.
- Offline: `/demo` reloads with two seed records after the first visit.
- Update: a v2 worker removes v1 and serves only the v2 offline shell.

Live Lighthouse 12.8.2 mobile results:

| Category or metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 0.9 s |
| LCP | 1.1 s |
| CLS | 0 |
| Total blocking time | 0 ms |

Raw first-load assets are 7,103 bytes of JavaScript, 13,963 bytes of CSS, and a 38,790-byte hero WebP. No font file loads.

## Live identity

Fresh HTTPS downloads match the local deployed build:

| File | SHA-256 |
| --- | --- |
| `index.html` | `9cb0a903e9bea4e2963c75517d06f161345a43b20918ecc745e4425177f61ef8` |
| `demo.html` | `bf34d9bf6a0d3863c6d94a42746e967cd18065f22ee3f4e6e4061e437c479b75` |
| `privacy.html` | `aaab336996451c5f25e0f001409901908e1f9efd6835cd271e9d199714176edb` |
| `terms.html` | `cddaeef4f75f8a77bd357ac3a97b38d34114b9ea7f3c174d1b2797a538df0911` |
| `404.html` | `fceee52dfdebd1393c770cf9981ba30236e6c9c0a64ff98b113e88bedbd794e7` |
| `sw.js` | `83517d10e94e675ad3f42da1358ad6befe3348395bc3db41a81db499451288c1` |
| `favicon.ico` | `82e749445d493b1d25e6e6ad50c529955029bd28d5a4342347128d56ea7837bb` |
| `assets/app.ac02950b81f7.js` | `ac02950b81f7941d3652ef1076f199b56cbd93a5358e8ad67130ee0efaec6e01` |
| `assets/styles.9ce45083aa34.css` | `9ce45083aa34d9352e9c63553027bcbacb72045822c2d429a48eac5b5e46b39b` |
| `assets/receipt-diorama.79d8d1721986.webp` | `79d8d1721986cce9a883888ec4f73b29ba5a6dcf72732445dc854eb7ee9f99e7` |

TLS is valid through 2027-02-28. Live HTML uses `no-cache`; fingerprinted assets use `public, max-age=31536000, immutable`.

## Privacy, billing, and infrastructure

There is no analytics, telemetry, account, payment, API, or backend. Billing metadata is not needed because the researched brief specifies a free MIT library.

The static demo stores no product state, so SQLite, tenant isolation, restart persistence, health endpoints, and 429 behavior are not applicable. Caller-provided durable-store restart behavior is covered as a library integration test.

No package publication was attempted. The factory can publish with `npm pack` and its registry credentials.

## Known limits

- A library cannot atomically commit an arbitrary remote side effect and caller-owned storage.
- If both the receipt store and outbox store reject a write, the caller receives signed fallback evidence but must reconcile it externally.
- Pre-signing the fallback adds one signer operation to each action.
- Azure applies a 30-second cache policy to the deliberate custom 404 response. Normal HTML routes are no-cache, and the worker never caches missing routes.

## Independent verification 3

Independent QA on 2026-09-05 is **PASS** with zero findings and zero untested
public claims. It reviewed implementation `b037aaf461672ba2579fd77bd1df1e705bbbed5a`
and the later documentation commit
`97802a6042a147836f49c45143762887ddbdf0f4`.

From a fresh checkout, `npm ci`, `npm test`, `npm run check`, `npm run lint`,
`npm run build`, `npm run test:consumer`, `npm run test:browser`,
`npm run test:claims`, `npm audit --omit=dev --audit-level=high`, and
`npm pack --dry-run` all passed. The eight declared claims passed independently.

Fresh live desktop and 390 px phone contexts confirmed the first-screen job,
audience, and sample action; populated/resettable isolated sample; normal,
failed, outbox, invalid, boundary, and recovery paths; keyboard/focus,
reduced-motion, dark-mode accessibility, legal routes, designed 404,
privacy/storage, worker offline reload, links, headers, and asset cache policy.
The live build byte-matches the reviewed implementation artifacts.

The full earlier report is `.factory/verification-3.md`. No product-code
changes were made during that verification. Its PASS conclusion is superseded
by strict review 1 below.

## Strict review 1

Strict review on 2026-09-05 reviewed implementation
`b037aaf461672ba2579fd77bd1df1e705bbbed5a` and documentation baseline
`97802a6042a147836f49c45143762887ddbdf0f4`. Live static files match the
reviewed build.

The result is **FAIL — 4 findings and 0 untested public claims**:

1. A throwing `redactResult` property accessor runs the tool but leaves only a
   prepared receipt, violating the core receipt invariant.
2. `verifyBundle()` throws for a malformed public key or missing receipt array
   instead of returning failed verification.
3. The landing page widens from 390 px to 471 px at 200% text size and clips
   first-screen content.
4. Whitespace-only required demo fields create a success receipt with a blank
   tool or empty authority value.

All eight claim commands and all documented clean-checkout commands passed,
which shows that the first fault is absent from the current claim matrix.
Fresh desktop and phone checks otherwise confirmed sample isolation, reset,
normal/failure/outbox paths, keyboard focus, reduced motion, dark contrast,
offline reload, route metadata, legal pages, links, response policy, and the
designed 404. Lighthouse scored 99/100/100/100. No product code was changed.
Full evidence is in `.factory/review-1.md`.
