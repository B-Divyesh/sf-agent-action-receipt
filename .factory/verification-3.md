# Verify signed action receipts and the demo site

**Verdict: PASS**

- Implementation candidate reviewed: `b037aaf461672ba2579fd77bd1df1e705bbbed5a`
- Documentation commit reviewed: `97802a6042a147836f49c45143762887ddbdf0f4`
- Live URL: https://agent-action-receipt.sociobot.in
- Verified: 2026-09-05 from a fresh clean checkout and fresh desktop and phone browser contexts
- Findings: 0
- Untested public claims: 0

The documentation commit is later than the implementation candidate. Its only
changes after the candidate are the repair handoff and an additional ledger
regression test; it does not alter the deployed product artifact. The live
HTML, worker, favicon, JavaScript, CSS, and hero asset match the build from
the reviewed checkout byte for byte.

## First screen

Before scrolling, a fresh desktop visit showed all three required facts.

- Job: “Record every consequential agent action.”
- Audience: “For teams giving agents real tool access.”
- First action: “Try it with sample data,” which opens `/demo`.

The landing response was 200 with title `Agent Action Receipt — Record
consequential actions`, `lang="en"`, one `h1`, and one `main` landmark.

## Clean checkout commands

The checkout was cloned fresh at `97802a6`, then `npm ci` installed eight
packages with zero vulnerabilities. Every declared command passed.

| Command | Result |
| --- | --- |
| `npm test` | PASS — 14 tests/subtests, including the fault matrix |
| `npm run check` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — library declarations, ESM, CommonJS, and `dist/site` |
| `npm run test:consumer` | PASS — packed ESM and CommonJS consumer test |
| `npm run test:browser` | PASS — 4 browser tests |
| `npm run test:claims` | PASS — all 8 declared claim commands run independently |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities |
| `npm pack --dry-run` | PASS — 24 files, 241.7 kB package, no bundled dependencies |

The packed-consumer test installs the generated package in an empty temporary
project and exercises its documented ESM and CommonJS APIs, types, MIT license,
privacy behavior, and finalization failures. This is a clean consumer check,
not a source import.

## Public claims

All claims in `.factory/claims.json` have one declared command and passed in
the clean checkout. A review of the landing page, demo, legal pages, and
README found no unlisted public promise that lacks coverage.

| Claim | Command | Result |
| --- | --- | --- |
| Every running action leaves final or unresolved evidence | `npm run claim:receipt-invariant` | PASS — 8 fault paths |
| Signed, hash-chained receipts omit raw arguments/results | `npm run claim:private-signed-bundle` | PASS |
| Concurrent calls produce a contiguous order | `npm run claim:ledger-order` | PASS — 16 contiguous receipts |
| Durable outbox restores and drains after restart | `npm run claim:restart-recovery` | PASS |
| Verification detects altered receipts | `npm run claim:tamper-detection` | PASS |
| Package installs and runs without a hosted service | `npm run claim:package-artifact` | PASS |
| Sample is populated, resettable, and stores no sample state | `npm run claim:demo-sandbox` | PASS |
| Sample reloads offline after its first visit | `npm run claim:offline-reload` | PASS |

## Live browser checks

Fresh Chromium contexts tested the live HTTPS site at 1440 px desktop and
390 × 844 px phone sizes. There were no page errors, console errors, failed
normal resource requests, third-party requests, cookies, local-storage
entries, or session-storage entries.

The one-click sample opened directly from the landing page with two realistic
`billing.refund` records, a linked-chain message, and the persistent label
“Demo — sample data, nothing is saved.” A normal outcome created a four-record
linked chain. A failed outcome created a linked failure receipt. The explicit
outbox outcome disabled further creation and showed the recovery message.
Reset restored the two seed records and the `billing.refund` value. The demo
keeps its data in page memory, so these steps did not change real data.

Invalid submission focused the required tool field and exposed the native
message “Please fill out this field.” A valid value then recovered normally.
The 500-character boundary input was constrained to 120 characters; the phone
page remained 390 px wide and the receipt was 314 px wide. All visible phone
controls were at least 44 × 44 CSS px.

Keyboard testing found the skip link first. The site has visible focus states,
and reduced motion set receipt animation to `1e-05s`. In a fresh phone context,
the controlled service worker served `/demo` offline after the initial visit;
the cached page retained its two sample receipts and announced offline status.

`@axe-core/playwright` returned zero violations for the desktop landing page,
the phone demo in dark mode, and the phone Privacy, Terms, and intentional 404
pages. `/opt/fleet/lib/verify-url.sh` also passed live: 200 response, 755 ms
load, valid title/language/main/alt structure, labelled buttons, and zero
console errors. The expected HTTP 404 page was deliberately returned with its
designed title, one `h1`, `main`, footer, and return link; its normal browser
404 resource message is not a defect.

## Routes, privacy, and responses

`/demo`, `/privacy`, and `/terms` each returned 200 with their route title,
one `h1`, `main`, and footer. `/404-check` returned the designed HTTP 404 page.
`robots.txt`, `sitemap.xml`, the source link, SVG/favicon ICO, and Apple touch
icon returned successfully.

The live document uses no-cache and fingerprinted JavaScript/CSS assets use
`public, max-age=31536000, immutable`. Responses carry HSTS,
`X-Content-Type-Options: nosniff`, strict referrer policy, a self-only CSP
including response-header `frame-ancestors`, and a restrictive
Permissions-Policy. There is no product backend, account, tenant, SQLite
service, health endpoint, or rate-limited API. Tenant isolation, HTTP 429, and
backend restart checks are therefore not applicable; caller-owned durable-store
restart recovery is exercised by the library claim test.

## Live identity

The following local build and live response SHA-256 values matched:

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

## Earlier findings

Every finding in `verification.md` and `verification-2.md` is now verified as
resolved.

| Earlier finding | Current disposition |
| --- | --- |
| Concurrent calls corrupted the receipt chain | Resolved: serialized 16-record chain claim passes. |
| Outbox could not survive restart | Resolved: restore, drain, and follow-up action claim passes. |
| Finalization gaps after a successful side effect | Resolved: pre-signed fallback fault matrix passes, including restart recovery. |
| Dark-mode contrast failures | Resolved: zero axe violations in phone dark demo and legal routes. |
| Long tool name widened the phone page | Resolved: 120-character boundary and no overflow verified live. |
| Old service worker could win after update | Resolved: controlled v1-to-v2 worker test passes. |
| Mobile links or copy control below 44 px | Resolved: all visible phone targets meet the minimum. |
| Missing favicon | Resolved: all icon routes return 200 and live console is clean. |
| Missing CSP/Permissions-Policy and immutable assets | Resolved: headers and cache policy verified live. |

## Result

**PASS — zero findings and zero untested public claims.**

