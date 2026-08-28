# Independent verification — FAIL

**Candidate:** `b7af11cd9e480119a82b5388b5dc435be6f3dd14`  
**Live URL:** https://agent-action-receipt.sociobot.in/  
**Verified:** 2026-08-28 (fresh clean checkout)

## Decision

**FAIL.** The deployed static site exactly matches the candidate and its normal
flows work, but the npm library fails its central hash-chain guarantee when a
single `ReceiptLedger` receives concurrent `execute()` calls. In addition, the
claimed outbox is process-memory only, so it cannot make a post-side-effect
final-write failure explicit after a restart. These defects mean the product
does not meet the researched brief's requirement that every successful side
effect have a verifiable final receipt or an explicit unresolved outbox item.

## Quality gates and package verification

All commands were run in the clean candidate checkout:

```sh
npm ci                         # 8 packages; 0 audit vulnerabilities
npm test                       # PASS: 3/3
npm run check                  # PASS
npm run build                  # PASS; produces dist/esm, dist/cjs, dist/site
npm pack --dry-run             # PASS: 55.5 kB tarball, 87.0 kB unpacked
npm audit --omit=dev --audit-level=high  # PASS: 0 vulnerabilities
```

`npm pack` was installed into a separate empty consumer. Its documented ESM
public API created and verified a two-receipt chain; CommonJS `require()` also
exposed `createReceiptLedger` and `verifyBundle`.

The site bundle is well within the stated static budget: `app.js` 3,563 B,
`styles.css` 8,345 B, and the first-screen WebP 38,790 B. There are no
production runtime dependencies, telemetry, CDN fonts, remote scripts, or
browser outbound requests other than the same-origin document, CSS, image, and
JavaScript requests. The external GitHub link is only navigated on user action.

## End-to-end and browser evidence

Playwright exercised the live production page at desktop 1440px and mobile
390px, with normal success, explicit failure, final-write-offline/outbox, empty
required-field validation and recovery.

- Success: `Chain verified locally: 2 linked receipts.`
- Failure: a failure receipt is filed and the chain remains verified.
- Outbox: `Explicit unresolved outbox item: the tool succeeded, but the final receipt was not persisted.`
- Empty tool submission: native required validation focused `#tool` with
  `Please fill out this field.`
- No horizontal overflow at 390px (`scrollWidth === clientWidth === 390`).
- Keyboard Tab traversal reaches the skip link, navigation, theme button,
  form controls, submit button, copy button, and footer links. Focus is a
  visible `4px` coral outline (`rgb(164, 61, 46)`).
- `prefers-reduced-motion: reduce` gives receipt transitions `0s`.
- Playwright axe returned **0 violations**, including zero serious/critical,
  on both viewports. No page errors or console errors occurred.
- Local service-worker shell caching was exercised: after it took control,
  an offline reload returned HTTP 200 and retained the expected title. The
  static site is not an installable PWA (no manifest), but its shipped service
  worker uses `skipWaiting()` and `clients.claim()`.

## Deployment identity, privacy, and responses

The live deployment is the candidate: SHA-256 matched local `dist/site` bytes
for every shipped asset below.

| Asset | SHA-256 |
| --- | --- |
| `index.html` | `8d229df2f52715baaf2e6357ef81622569b49df434b53c99c06c0651b394e79b` |
| `styles.css` | `5e9399eb135b55baaf9f5a4143241223713724ba06e129b04439a21af2caa74a` |
| `app.js` | `2be90a75d28230101741401a128a1480238b588e59617394a16a1a4b1d441509` |
| `sw.js` | `f8a4abcaed1d10506f5c8c18fc38a9a95abac41aebea5b88ab64955c4feb8496` |
| `privacy.html` | `25bf2cf468defb258fe94c8e3c3b519644b016c84c1e5cca6c861d1920792c62` |
| `terms.html` | `e45cbad77a6c9a536bf19266704d8133cf376123fbdf4c66a32648cc643510c3` |
| `assets/receipt-diorama.webp` | `79d8d1721986cce9a883888ec4f73b29ba5a6dcf72732445dc854eb7ee9f99e7` |

`/privacy.html` and `/terms.html` both returned 200 and contain title, language,
main landmark, and one h1. The landing page has `lang=en`, one h1, title, main,
meaningful image alt text, and original-asset provenance in the design docs.
There are no API or server-side product endpoints, accounts, or sign-in, so
rate-limit and Entra tenant checks are not applicable.

Live response headers do provide HTTPS, HSTS, `nosniff`, ETag, and
`strict-origin-when-cross-origin`. They do not provide a Content-Security-Policy
or Permissions-Policy; every asset uses the same short
`Cache-Control: public, must-revalidate, max-age=30` policy.

## Defects

### Critical — concurrent `execute()` calls corrupt the hash chain

**Reproduction:** Build the candidate, then invoke eight public
`ledger.execute()` promises concurrently using one ledger and successful tool
functions:

```js
const results = await Promise.all([...Array(8)].map((_, i) =>
  ledger.execute({ tool: `tool.${i}`, authority: { grant: 'g' },
    args: { i }, run: async () => ({ i }) })
));
verifyBundle(ledger.exportBundle());
```

All eight calls report successful side effects, but the resulting 16 entries
have sequences `1,1,1,1,1,1,1,1,9,9,9,9,9,9,9,9`; the first eight have
`previousHash: null`. Verification returns:

```json
{"ok":false,"checked":2,"error":"receipt 1: sequence is not contiguous"}
```

The `await` in `persistFinal()` allows each call to construct its prepared
receipt before any call pushes an entry. The product advertises a total order
per ledger, but exposes no serialization or rejection for concurrent calls.
This makes successful actions unverifiable and directly breaks the core job.

### High — unresolved outbox is not durable or restart-recoverable

On final `ReceiptStore.append()` failure, the final receipt is only put in the
private in-memory `outbox` array. `ReceiptStore` has only `append()`; there is
no outbox persistence, no ledger restoration API, and no way to reload an
unresolved item after process termination. A crash after the successful tool
call and failed final write leaves only the prepared receipt in the durable
store, so the completed action is no longer represented by either a final
receipt or explicit unresolved outbox. This contradicts the brief's fault
injection success measure and the page's "durable outbox item" claim.

### Moderate — response hardening and cache policy are incomplete

The live site omits `Content-Security-Policy` and `Permissions-Policy`; asset
responses are unversioned and cached for only 30 seconds rather than using
hashed immutable asset caching. This is not the cause of the FAIL, but falls
short of the requested browser response-policy and static caching quality bar.

### Low — copy control is below the stated touch-target minimum

At 390px the keyboard-operable `Copy install command` button measures
161 × 30 CSS pixels. The contract calls for controls at least 44px high.

## Required resolution and re-verification

1. Serialize an entire logical action per ledger (or explicitly reject
   concurrent `execute()` calls before any receipt is created) and add a
   concurrent-execution regression test that verifies the exported chain.
2. Make failed final receipts/outbox items durable through a caller-provided
   persistence contract, and support reloading/draining them after restart;
   add a crash/restart fault-injection test.
3. Add deploy response policies and immutable caching for fingerprinted static
   assets, then enlarge the copy control to 44px minimum.
4. Re-run this verification against the new commit and confirm live asset hashes
   match it before changing this result to PASS.
