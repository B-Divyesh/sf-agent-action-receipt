# Review signed action receipt verification — FAIL

**Verdict: FAIL**

- Implementation candidate: `b037aaf461672ba2579fd77bd1df1e705bbbed5a`
- Documentation baseline: `97802a6042a147836f49c45143762887ddbdf0f4`
- Live URL: https://agent-action-receipt.sociobot.in
- Reviewed: 2026-09-05
- Findings: 4
- Untested public claims: 0

The live site matches the implementation candidate, and every declared command
passes from a clean checkout. The result is still **FAIL** because an additional
fault case breaks the central receipt guarantee, the verifier throws on
malformed input, and two live browser paths miss the required baseline.

## First screen before scrolling

Fresh desktop (1440 × 900) and phone (390 × 844) browsers showed the required
information without scrolling.

- Job: “Record every consequential agent action.”
- Audience: “For teams giving agents real tool access.”
- First action: “Try it with sample data.”

On the phone, the headline ended at 616 px, the audience sentence at 729 px,
and the sample action at 806 px. Default page width was 390 px.

## Findings

### Critical — a throwing result-redactor accessor bypasses final evidence

The package promises that every action that runs leaves a verifiable final
receipt or explicit unresolved evidence. A valid JavaScript/TypeScript options
object may expose `redactResult` through a getter. If that getter throws when
the ledger checks whether a redactor exists, the exception occurs after
`run()` and outside every finalization recovery block.

Reproduced through the built public ESM artifact:

```js
const options = {
  tool: 'mail.send', authority: { grant: 'g' }, args: {},
  run: () => { effects++; return { ok: true }; }
};
Object.defineProperty(options, 'redactResult', {
  get() { throw new Error('redactResult getter crashed'); }
});
await ledger.execute(options);
```

Observed result:

```json
{
  "effects": 1,
  "entries": ["prepared"],
  "outbox": 0,
  "verify": {"ok": true, "checked": 1},
  "error": "redactResult getter crashed"
}
```

The tool side effect happened, but the chain reports only a valid prepared
receipt. There is no final receipt, unresolved receipt, outbox item, or signed
evidence on the thrown error. This violates the researched success measure and
the `receipt-invariant` public claim. Its declared test checks a redactor
callback that throws, not a property accessor that throws.

### Moderate — malformed bundles throw instead of failing verification

`verifyBundle()` is a local verifier with a `VerificationResult` return type.
It returns `{ ok: false }` for a changed receipt, but malformed external bundle
structure can escape as an exception.

- Replacing `publicKeyPem` with `"not a PEM key"` throws
  `ERR_OSSL_UNSUPPORTED` from OpenSSL.
- Removing `receipts` throws `TypeError: bundle.receipts is not iterable`.
- A bad signature and unsupported version return normal failed results.

A damaged or hostile bundle can therefore terminate an incident-review path
unless each caller adds another exception boundary. Malformed input should be
classified as failed verification.

### Moderate — the landing page loses content at 200% text size

In a fresh 390 px browser, setting the root text size to 200% increased the
document width to 471 px. The hero extended 81 px beyond the viewport, clipping
the headline, primary action, and image. Evidence:
`/work/.evidence/review-1-text-resize.png`.

The demo, Privacy, and Terms routes stayed 390 px wide under the same check.
The landing failure does not meet the accessibility requirement that text
resize to 200% without loss.

### Low — whitespace-only required demo fields create blank evidence

The demo marks Tool name and Authority grant as required. Native validation
rejects empty values, but both inputs accept whitespace-only values. The script
trims them after validation and still creates a successful four-record chain.

- Tool name `"   "`: zero invalid controls, success status, and a blank tool
  label in the new receipt.
- Authority grant `"   "`: zero invalid controls and a success receipt hashing
  an empty authority string.

This main sample accepts records that the npm library rejects for the tool
name. Reset still restores the original sample.

## Clean checkout and declared claims

A detached clean checkout at documentation SHA `97802a6` was used. The only
changes between implementation SHA `b037aaf` and that checkout are the handoff
and a regression test; deployed product files are unchanged.

`npm ci` installed eight packages with zero vulnerabilities. Every documented
command passed:

| Command | Result |
| --- | --- |
| `npm test` | PASS — 14 tests and subtests |
| `npm run check` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — ESM, CommonJS, declarations, and `dist/site` |
| `npm run test:consumer` | PASS — packed artifact in an empty project |
| `npm run test:browser` | PASS — 4 browser tests |
| `npm run test:claims` | PASS — all 8 declared claim commands |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities |
| `npm pack --dry-run` | PASS — 24 files, 241.7 kB packed |

Each claim command was also run separately:

| Claim | Declared command | Review result |
| --- | --- | --- |
| Every running action leaves final or unresolved evidence | `npm run claim:receipt-invariant` | Command passes; claim is false for Finding 1 |
| Signed, hash-chained receipts omit raw values | `npm run claim:private-signed-bundle` | PASS |
| Concurrent calls produce a contiguous order | `npm run claim:ledger-order` | PASS — 16 contiguous receipts |
| Durable outbox restores and drains | `npm run claim:restart-recovery` | PASS |
| Verification detects an altered receipt | `npm run claim:tamper-detection` | PASS; malformed input is Finding 2 |
| Packed package runs without a hosted service | `npm run claim:package-artifact` | PASS |
| Sample is populated, resettable, and isolated | `npm run claim:demo-sandbox` | PASS |
| Sample reloads offline after first visit | `npm run claim:offline-reload` | PASS |

No public claim lacked a declared command. The first claim has a test, but the
counterexample shows that its fault matrix is incomplete.

## Live sample, routes, privacy, and accessibility

The one-click sample opened `/demo` with two realistic `billing.refund`
records, authority `refund-v3 · support case 741`, and the persistent label
“Demo — sample data, nothing is saved.”

- Success produced four linked records.
- Failure produced a linked failed receipt.
- The outbox choice produced an explicit unresolved item, recovery text, and
  disabled further submission.
- Reset restored the two seed records and original fields.
- Empty required input focused the tool field with “Please fill out this
  field.” A valid value then recovered normally.
- A 500-character tool value was limited to 120 characters without overflow.
- Reload restored the seed. There were no cookies, local/session storage
  values, IndexedDB databases, third-party requests, or product-data writes.
- “Start for real” points to the install section and leaves the sample.

Fresh light desktop and dark phone checks found zero axe violations. The phone
demo had no target smaller than 44 × 44 px. Keyboard order reached the skip
link first and every control had a visible 4 px focus outline. Space operated
the theme and reset buttons; arrow and Enter operated the outcome and submit
controls. Reduced motion set receipt animation to `0.00001s`.

`/privacy` and `/terms` returned 200 with distinct titles, one h1, main,
header, footer, and zero axe violations. The privacy page explains requests
when the site holds no user data. A missing URL deliberately returned the
designed HTTP 404 page with its own title, h1, main, return action, and zero axe
violations. Its expected 404 resource message is not a finding.

Every landing link returned 200, including the source repository. The Open
Graph image returned 200 at its fingerprinted URL. The factory URL verifier
passed with no console errors. A fresh service-worker context reloaded `/demo`
offline with two seed records and an offline status. The local controlled
v1-to-v2 worker update test passed.

Lighthouse 12.8.2 mobile results were Performance 99, Accessibility 100, Best
Practices 100, and SEO 100. FCP was 0.875 s, LCP 1.075 s, CLS 0, total blocking
time 0 ms, and transfer size 63,796 bytes. Initial JavaScript is 7,103 bytes,
CSS is 13,963 bytes, and the hero WebP is 38,790 bytes.

## Live identity and response policy

All reviewed local build files matched their live response byte for byte.

| File | SHA-256 |
| --- | --- |
| `index.html` | `9cb0a903e9bea4e2963c75517d06f161345a43b20918ecc745e4425177f61ef8` |
| `demo.html` | `bf34d9bf6a0d3863c6d94a42746e967cd18065f22ee3f4e6e4061e437c479b75` |
| `privacy.html` | `aaab336996451c5f25e0f001409901908e1f9efd6835cd271e9d199714176edb` |
| `terms.html` | `cddaeef4f75f8a77bd357ac3a97b38d34114b9ea7f3c174d1b2797a538df0911` |
| `404.html` | `fceee52dfdebd1393c770cf9981ba30236e6c9c0a64ff98b113e88bedbd794e7` |
| `sw.js` | `83517d10e94e675ad3f42da1358ad6befe3348395bc3db41a81db499451288c1` |
| `assets/app.ac02950b81f7.js` | `ac02950b81f7941d3652ef1076f199b56cbd93a5358e8ad67130ee0efaec6e01` |
| `assets/styles.9ce45083aa34.css` | `9ce45083aa34d9352e9c63553027bcbacb72045822c2d429a48eac5b5e46b39b` |
| `assets/receipt-diorama.79d8d1721986.webp` | `79d8d1721986cce9a883888ec4f73b29ba5a6dcf72732445dc854eb7ee9f99e7` |

HTML and the worker use `no-cache`; fingerprinted assets use one-year
immutable caching. Responses include HSTS, `nosniff`, strict referrer policy,
a self-only CSP with header-delivered `frame-ancestors`, and restrictive
Permissions-Policy.

This is a static site and npm library. It has no backend, tenant, account,
SQLite service, health endpoint, or product API, so tenant isolation, backend
restart, and HTTP 429/`Retry-After` checks do not apply. Caller-owned durable
store restart behavior is covered by the package test. AI assistance would not
improve this cryptographic library's core job, so no AI feature is expected.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Concurrent calls corrupted the chain | Resolved: 16 contiguous verified receipts. |
| Outbox did not survive restart | Resolved: restore, drain, and follow-up execution pass. |
| Post-effect hashing, callback, or signing failures bypassed final evidence | Reported cases resolved; the guarantee still fails through Finding 1. |
| Dark-theme contrast failed | Resolved: dark demo and legal routes have zero axe violations. |
| Long tool names widened the phone page | Resolved at default text size: 120-character limit and 390 px width. |
| Old worker could serve the old shell | Resolved: controlled v1-to-v2 offline update passes. |
| Mobile targets were below 44 px | Resolved: all visible phone targets meet 44 × 44 px. |
| Favicon was missing | Resolved: all icon routes return 200; console is clean. |
| Response policy or immutable caching was missing | Resolved in live headers. |

## Required next work

1. Read `redactResult` before the tool runs or guard every post-effect property
   access with the existing fallback. Add the accessor fault to the packed
   public invariant test.
2. Validate bundle shape and catch key parsing errors so `verifyBundle()`
   returns failed verification for malformed input.
3. Keep the landing grid within 390 px at 200% text size and add a browser
   regression.
4. Reject trimmed-empty tool and authority values, announce the error, and
   cover both fields in the sandbox test.

**Final result: FAIL — 4 findings, 0 untested public claims.**
