# Review Agent Action Receipt — PASS

**Verdict: PASS — 0 findings and 0 untested public claims.**

- Implementation candidate: `368c7c2b2252958b7e8031eb01ab6168f18f1ffe`
- Documentation baseline reviewed: `b660c6f7ce17e194f37b36f4b3408118f4d2df25`
- Live URL: https://agent-action-receipt.sociobot.in
- Reviewed: 2026-09-05

`b660c6f` changes only reports from the implementation candidate. The live
landing page, demo page, application JavaScript, and stylesheet byte-match a
fresh build from `368c7c2`; the deployment therefore represents the reviewed
implementation.

## First screen

Fresh Chromium desktop (1440 × 900) and phone (390 × 844) contexts were opened
before scrolling.

- Job: “Record every consequential agent action.”
- Audience: “For teams giving agents real tool access, it records signed evidence before and after each action.”
- First action: “Try it with sample data.” It opens `/demo` and its button ends at 806 px on the 844 px phone viewport.

The landing page has the required language, title, one `h1`, and one `main`.

## Clean checkout, artifact, and claims

A new local clone at the documentation baseline was installed with `npm ci`
(eight packages, zero vulnerabilities). Every command declared in README
passed:

| Command | Result |
| --- | --- |
| `npm test` | PASS — 19 tests/subtests |
| `npm run check` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — ESM, CommonJS, declarations, and `dist/site` |
| `npm run test:consumer` | PASS — packed ESM, CommonJS, declarations, and MIT artifact in an empty consumer |
| `npm run test:browser` | PASS — 5 browser tests |
| `npm run test:claims` | PASS — executes all eight declared claim commands |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities |
| `npm pack --dry-run` | PASS — 24 files, 243.9 kB package |

All claims in `.factory/claims.json` have an exact command and that command
passed as part of `npm run test:claims`:

| Claim | Result |
| --- | --- |
| Every running action leaves final or unresolved evidence | PASS — includes accessor, finalization, persistence, and restart faults |
| Signed chained receipts omit raw arguments and results | PASS |
| Concurrent calls preserve contiguous ledger order | PASS |
| Durable outbox restores and drains | PASS |
| Changed or malformed bundles fail without throwing | PASS |
| Packed package runs locally with ESM, CommonJS, declarations, and no production dependencies | PASS |
| Browser sample is populated, resettable, and isolated | PASS |
| Sample reloads offline after the first visit | PASS |

The landing, demo, legal pages, and README were cross-checked against the
claim registry. There are no unlisted public claims and no untested claims.

## Live browser verification

Fresh live desktop and phone contexts had no page errors, console errors, or
failed requests.

- `/demo` begins with two realistic linked `billing.refund` records and the
  persistent label “Demo — sample data, nothing is saved.”
- A normal action creates four records. Reset returns to the two-record seed.
  The sample uses neither cookies nor local/session storage; all demo requests
  observed were same-origin.
- Spaces-only tool input is rejected with `aria-invalid` and no new record.
  A corrected action recovers. Failed and unresolved-outbox outcomes each show
  the corresponding evidence; outbox disables further submission.
- Phone keyboard focus reaches the skip link first. The tested target set meets
  the 44 px minimum. At 200% text, the 390 px landing remains 390 px wide and
  its key elements remain in bounds. Reduced motion reduces receipt animation
  to effectively zero duration.
- A fresh service-worker context reloaded `/demo` offline after control,
  retaining the seed records and showing the offline status.
- Playwright axe found zero violations on desktop landing, phone demo/outbox,
  Privacy, Terms, and the designed 404. `/opt/fleet/lib/verify-url.sh` also
  passed live: 572 ms load, title/language/main/alt structure, and no console
  errors.

`/demo`, `/privacy`, `/terms`, every referenced icon/asset, `robots.txt`,
`sitemap.xml`, and the source-repository link return successfully. Privacy and
Terms have distinct route titles, one `h1`, and one `main`. An unknown route
returns the designed HTTP 404 page with title, `h1`, `main`, footer, and a link
back. The intentional 404 status is expected and is not a defect.

## Live identity and platform scope

| File | SHA-256 |
| --- | --- |
| `index.html` | `34bae241500d376fd82d009ca6430121177605c425f7b5b6fc7527a110bb31b9` |
| `demo.html` | `b0db47f0c46ebdc1f3354de7e4c15e46c9352e84f33bc7930b8207bcfa8a4d33` |
| `assets/app.57dde536388f.js` | `57dde536388f46ab129e6e0fba32a4befb17560f17ea72d460a13d895abffcff` |
| `assets/styles.18b0bd6f8ce8.css` | `18b0bd6f8ce87f6ec09d4dfba9cbc43cbcbe8c6214bf8be188b843ddb72b63fa` |

Live HTML is no-cache; the checked fingerprinted assets are immutable. Headers
include HSTS, `nosniff`, strict referrer policy, a self-only CSP with
header-delivered `frame-ancestors`, and restrictive Permissions-Policy.

This is an npm library with a static documentation/demo site. It has no hosted
backend, account, tenant, SQLite product state, health endpoint, or
rate-limited product API. Tenant isolation, backend restart, and 429/
`Retry-After` checks do not apply. The caller-owned durable-store restart path
is exercised by the installed-library claim.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Concurrent chain corruption | Resolved: serialized contiguous-chain claim passes. |
| Outbox did not survive restart | Resolved: restore, drain, and follow-up execution pass. |
| Post-effect finalization gaps, including a throwing accessor | Resolved: the fault matrix passes and the accessor prevents the tool run. |
| Malformed verifier input threw | Resolved: malformed values return failed verification. |
| Dark contrast failure | Resolved: axe passes in the tested dark demo state. |
| Long tool input or 200% text overflow | Resolved: phone and 200% checks remain within 390 px. |
| Whitespace demo evidence | Resolved: input is rejected before a receipt is added. |
| Stale service-worker shell | Resolved: fresh offline reload claim passes. |
| Small mobile targets, missing favicon, or missing response policy | Resolved: target, icon, headers, cache, and console checks pass. |

## Result

**PASS — 0 findings and 0 untested public claims.**
