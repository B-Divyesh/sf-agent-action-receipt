# QA handoff — Agent Action Receipt

## Status

PASS. Independent verification 4 found zero findings and zero untested public
claims. Version `0.1.3` fixes all four strict-review findings and preserves
every earlier repair. All documented commands and eight public claim commands
pass from a fresh clone. The repaired site is live at
https://agent-action-receipt.sociobot.in.

- Implementation SHA: `368c7c2b2252958b7e8031eb01ab6168f18f1ffe`
- Documentation SHA: `e6cc44cfdda057f1621711f07d25715305266e67`
- Deployment ID: `67386590-2b93-4ad2-8e97-79f5d7adc5aa`
- Deployment target: existing product-owned `sf-agent-action-receipt` static app
- Documentation: this handoff is a later report-only commit; it does not change the deployed artifact

The work order referenced `/work/.evidence/qa-result.json`; it was absent at
the start of this verification. This run writes the required PASS result and
copy of the report after reviewing `.factory/review-1.md` and every earlier
report.

## Verification 4

Independent evidence is recorded in `.factory/verification-4.md`. It covers
live identity, desktop and phone sessions, demo isolation and reset,
normal/invalid/boundary/recovery paths, keyboard, 200% text, reduced motion,
axe, offline reload, routes, legal pages, 404, links, response policy, and the
installed package consumer. All eight claims passed independently from a clean
clone. The static site and local library have no backend, tenant, health, or
HTTP rate-limit surface; durable-store restart behavior is covered by the
library test.

## Strict-review repairs

| Finding | Repair | Outcome check |
| --- | --- | --- |
| A throwing `redactResult` accessor can leave only a prepared receipt | `execute()` reads every caller-controlled execution option before it writes the prepared receipt or calls the tool. | The exact throwing accessor runs through unit and packed-consumer tests. The effect count stays zero and the ledger stays empty. |
| Malformed bundles can crash `verifyBundle()` | The verifier accepts `unknown`, validates root, receipt, outbox, and key shapes, parses the public key once, and converts parse or verification exceptions to `{ ok: false }`. | Changed content, invalid PEM, missing receipts, invalid root, invalid receipt, and invalid outbox values all return failed results without throwing. |
| Landing content clips at 200% text | Grid children can shrink, buttons stay inside their container, and the mobile heading wraps. | A 390 px browser at 200% root text has `scrollWidth === clientWidth === 390`; the heading, audience, action, and image stay within the viewport. |
| Whitespace-only demo fields create blank evidence | Tool and authority values receive trimmed custom validation before receipt creation. Invalid events update the live status and focus the failing field. | Each spaces-only value leaves the two-record seed unchanged, exposes `aria-invalid`, focuses the correct field, and announces what to enter. A corrected submission succeeds. |

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Concurrent calls corrupted the chain | Eight concurrent actions produce 16 contiguous, verified receipts. |
| Outbox data did not survive restart | A recoverable store restores, drains, and continues the receipt chain. |
| Post-effect hashing, callback, or signing failures lost final evidence | The pre-signed unresolved fallback fault matrix passes, including restart and total-persistence-failure paths. |
| Dark treatment failed contrast | Landing, demo outbox state, Privacy, Terms, and 404 have zero axe violations in tested light/dark contexts. |
| Long tool names widened the phone page | Input is limited to 120 characters, labels wrap, and the page stays within 390 px. |
| A service-worker update served the old shell | The controlled v1-to-v2 test removes the v1 cache and reloads the v2 title offline. |
| Mobile links and copy control were below 44 px | Every visible phone link, button, input, and select is at least 44 by 44 CSS px. |
| Missing favicon caused a browser error | SVG, ICO, and Apple touch icons return 200; cold-load consoles are clean. |
| CSP, Permissions-Policy, and immutable caching were missing | Live responses carry the restrictive policies; fingerprinted assets have one-year immutable caching. |

## Clean verification

The following commands ran in a fresh local clone of implementation SHA
`368c7c2b2252958b7e8031eb01ab6168f18f1ffe`:

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

Results:

- `npm ci`: eight packages, zero vulnerabilities.
- `npm test`: 19 tests and subtests pass, including nine receipt-invariant fault paths.
- Type check and lint pass.
- Build writes ESM, CommonJS, declarations, and `dist/site`.
- The packed artifact installs into an empty consumer and runs through ESM and CommonJS.
- Browser suite: five tests pass across routes, demo states, 200% text, accessibility, offline reload, and worker update.
- All eight `.factory/claims.json` commands pass independently; no public claim is untested.
- Production dependency audit reports zero vulnerabilities.
- Package: 243.9 kB packed, 327.2 kB unpacked, 24 files, SHA-1 `04e7216dd035dca09565f3ddf37c1c2dc874b284`.

The factory URL verifier passes locally and live with one h1, a main landmark,
valid language/title/alt structure, labelled controls, and no console errors.

## Live browser and accessibility evidence

Fresh Chromium contexts were used after deployment.

- Desktop 1440 × 900: the job, audience, and “Try it with sample data” action are visible before scrolling.
- Phone 390 × 844: the same first action ends at 806 px, before the viewport bottom.
- The sample opens with two realistic linked `billing.refund` records and authority `refund-v3 · support case 741`.
- The persistent banner says “Demo — sample data, nothing is saved.” A success adds two linked records; Reset restores the two-record seed.
- Spaces-only tool and authority values are rejected without adding a receipt. Correcting the fields recovers normally.
- At 200% text, the 390 px landing page remains 390 px wide with no clipped key content.
- The demo creates no cookies, local storage, session storage, or IndexedDB databases. All observed requests use the product origin.
- All tested phone controls meet 44 × 44 px. Reduced motion removes meaningful receipt movement.
- Axe reports zero violations on the landing, demo, Privacy, Terms, and designed 404 states.
- Privacy and Terms return 200 with distinct titles, one h1, and one main. A deliberate unknown URL returns the designed HTTP 404 page.
- A fresh service-worker context reloads `/demo` offline with the two seed records and an offline notice.
- All site links return 200, including the source repository. Cold browser consoles have no errors.

Live Lighthouse 12.8.2 mobile results:

| Category or metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 0.93 s |
| LCP | 1.07 s |
| CLS | 0 |
| Total blocking time | 77 ms |

Initial raw assets are 8,410 bytes of JavaScript, 14,065 bytes of CSS, and a
38,790-byte hero WebP. No font file loads.

## Live identity and response policy

Every checked live file byte-matches the build from implementation SHA
`368c7c2b2252958b7e8031eb01ab6168f18f1ffe`.

| File | SHA-256 |
| --- | --- |
| `index.html` | `34bae241500d376fd82d009ca6430121177605c425f7b5b6fc7527a110bb31b9` |
| `demo.html` | `b0db47f0c46ebdc1f3354de7e4c15e46c9352e84f33bc7930b8207bcfa8a4d33` |
| `privacy.html` | `b512e373c6f31d9c721b6fe10a471b1639479b10e031a5c344f7f4ce77146a82` |
| `terms.html` | `b05470928c261c4ffb825e315afb47ee756f79fc77e415db4d5154f92a7eaf43` |
| `404.html` | `a9eab407ab73ef67c77fc1cffd1aa3fbd1b7435ecaa6e0d6e0c609deba07dbe9` |
| `sw.js` | `be7637a76bc594848bc5bc80105258f219e73a0f4576c02b4f0656565e738097` |
| `assets/app.57dde536388f.js` | `57dde536388f46ab129e6e0fba32a4befb17560f17ea72d460a13d895abffcff` |
| `assets/styles.18b0bd6f8ce8.css` | `18b0bd6f8ce87f6ec09d4dfba9cbc43cbcbe8c6214bf8be188b843ddb72b63fa` |
| `assets/receipt-diorama.79d8d1721986.webp` | `79d8d1721986cce9a883888ec4f73b29ba5a6dcf72732445dc854eb7ee9f99e7` |

Live HTML is `no-cache`. Fingerprinted assets use
`public, max-age=31536000, immutable`. Responses include HSTS, a self-only CSP
with header-delivered `frame-ancestors`, restrictive Permissions-Policy,
strict referrer policy, and `nosniff`.

## Privacy, billing, and infrastructure

There is no analytics, telemetry, account, payment, hosted API, or backend.
The researched offer is a free MIT library, so billing registration and
`billing-offer.json` do not apply. No package publication was attempted; the
factory can publish the ready artifact with its registry credentials.

The static sample stores no server state, so SQLite, tenant isolation, health,
restart persistence, and HTTP 429 checks are not applicable. Caller-owned
durable-store restart behavior is covered by the library integration test.
AI model use would not improve this cryptographic protocol's core job, so no AI
feature was added.

The catalog description is verb-first, 82 characters, and copied to
`/work/.evidence/catalog-description.txt`.

## Known limits

- A library cannot atomically commit an arbitrary remote side effect and caller-owned receipt storage.
- If both receipt and outbox stores reject a write, the caller receives signed fallback evidence and must reconcile it externally.
- Pre-signing the unresolved fallback adds one signer operation to every action.
- One ledger has one order; separate processes need caller-provided coordination.
- Azure applies a short cache policy to the deliberate custom 404 response. Normal HTML is no-cache, and the worker does not cache missing routes.
