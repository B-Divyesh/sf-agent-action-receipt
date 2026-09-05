# Verify Agent Action Receipt — PASS

**Verdict: PASS — 0 findings and 0 untested public claims.**

- Implementation candidate: `368c7c2b2252958b7e8031eb01ab6168f18f1ffe`
- Documentation commit: `e6cc44cfdda057f1621711f07d25715305266e67`
- Live URL: https://agent-action-receipt.sociobot.in
- Verified 2026-09-05 from a fresh clean clone and fresh desktop/phone Chromium contexts.

`e6cc44c` changes only the handoff after the implementation candidate. Live
HTML, worker, favicon, JavaScript, CSS, and hero illustration byte-match the
build from `368c7c2`.

## First screen

Before scrolling, the page states:

- Job: “Record every consequential agent action.”
- Audience: “For teams giving agents real tool access, it records signed evidence before and after each action.”
- First action: “Try it with sample data,” which opens `/demo`.

At 390 × 844, the headline, audience, and action end at 616 px, 729 px, and
806 px respectively. Landing structure is `lang="en"`, one `h1`, one `main`,
and title `Agent Action Receipt — Record consequential actions`.

## Clean-clone commands and claims

The fresh clone installed with `npm ci`; every declared command passed:

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

`npm test` passed 19 tests/subtests. The browser suite passed five tests. The
packed consumer test exercised ESM, CommonJS, declarations, MIT license, and
no-hosted-service behavior from an empty temporary project. Production audit
reported zero vulnerabilities; `npm pack --dry-run` produced a 24-file,
243.9 kB ready-to-publish package with no bundled dependencies.

Every claim command was then run separately and passed:

| Claim command | Result |
| --- | --- |
| `npm run claim:receipt-invariant` | PASS — nine fault paths, including throwing accessor and restart recovery |
| `npm run claim:private-signed-bundle` | PASS |
| `npm run claim:ledger-order` | PASS — 16 contiguous receipts |
| `npm run claim:restart-recovery` | PASS |
| `npm run claim:tamper-detection` | PASS |
| `npm run claim:package-artifact` | PASS |
| `npm run claim:demo-sandbox` | PASS |
| `npm run claim:offline-reload` | PASS |

The landing page, sample, legal pages, and README were cross-checked against
`.factory/claims.json`; no public claim lacks a declared test.

## Live paths and accessibility

Fresh desktop and phone sessions had no JavaScript or page errors. Sample-flow
requests were same-origin only and created no cookies, local-storage values, or
session-storage values.

- `/demo` opens with two realistic linked `billing.refund` receipts and the
  persistent label “Demo — sample data, nothing is saved.”
- A normal submission creates four linked receipts; Reset restores the two
  receipt seed. No sample state reaches real data.
- Whitespace-only tool and authority values create no receipt, set
  `aria-invalid`, focus the invalid field, and announce the corrective text.
  A valid correction succeeds.
- A 500-character tool name is limited to 120 characters. At 390 px the page
  remains 390 px wide and its receipt is 314 px wide.
- Failure and unresolved-outbox outcomes show their evidence; the outbox state
  shows recovery text and disables another submission.
- Keyboard reaches the skip link first. All visible phone controls are at least
  44 × 44 CSS px. At 200% text the 390 px page remains 390 px wide and key
  elements stay in the viewport. Reduced motion uses `1e-05s` animation.
- A fresh controlled service-worker context reloads `/demo` offline with the
  two seed receipts and its offline notice.

`@axe-core/playwright` reported zero violations on the desktop landing, phone
demo in normal and outbox states, explicit dark landing, Privacy, Terms, and
the designed 404. `/opt/fleet/lib/verify-url.sh` also passed live: 567 ms load,
valid title/language/main/alt/button structure, and no console errors.

`/demo`, `/privacy`, `/terms`, `robots.txt`, `sitemap.xml`, favicon, Apple
touch icon, and the source repository link return successfully. Privacy and
Terms have route titles, one `h1`, and one `main`. An unknown route returns a
designed HTTP 404 with title, `h1`, `main`, footer, and a return link; the
deliberate 404 is expected, not a defect.

## Live identity and platform limits

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

Responses carry HSTS, `nosniff`, strict referrer policy, self-only CSP with
header-delivered `frame-ancestors`, and restrictive Permissions-Policy. HTML
is no-cache; fingerprinted assets are immutable. This static documentation site
and local library have no backend, account, tenant, product API, SQLite,
health endpoint, or rate-limited endpoint. Tenant isolation, HTTP
429/`Retry-After`, and server restart checks do not apply; caller-owned durable
store restart recovery is covered by the installed-library claim.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Concurrent chain corruption | Resolved: serialized 16-receipt claim verifies. |
| Outbox restart loss | Resolved: restore, drain, and follow-up action pass. |
| Post-effect finalization gaps | Resolved: pre-signed fallback, accessor, restart, and total-persistence fault paths pass. |
| Malformed verifier input threw | Resolved: malformed values return failed verification. |
| Dark contrast failure | Resolved: zero axe violations in automatic and explicit dark modes. |
| Long tool value overflow | Resolved: 120-character bound and 390 px live layout pass. |
| 200% text clipping | Resolved: no overflow and no clipped key element. |
| Whitespace demo evidence | Resolved: live validation blocks both fields and recovers. |
| Old worker could serve old shell | Resolved: controlled update and live offline reload pass. |
| Small mobile targets | Resolved: all visible targets meet 44 px. |
| Missing favicon, response policy, or immutable assets | Resolved: icon, headers, console, and caching pass. |

## Result

**PASS — zero findings and zero untested public claims.**
