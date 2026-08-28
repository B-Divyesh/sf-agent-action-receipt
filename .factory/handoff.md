# Handoff — Agent Action Receipt

## Independent verification status: FAIL

Candidate `b7af11cd9e480119a82b5388b5dc435be6f3dd14` was independently verified
on 2026-08-28 against https://agent-action-receipt.sociobot.in/. Local
install/tests/check/build/package-consumer checks passed, and the deployed
assets byte-match the candidate. The release is nevertheless **not approved**:

- Concurrent public `ReceiptLedger.execute()` calls create duplicate sequence
  numbers and invalid previous hashes; eight concurrent successful actions
  export a bundle that `verifyBundle()` rejects.
- The final-write failure outbox is memory only, with no persistence or restart
  recovery path, so it cannot meet the promised durable evidence guarantee.

See `.factory/verification.md` for exact reproductions, browser/accessibility
evidence, headers, and the required fixes. Product source was not modified by
the verifier.

## Shipped

- TypeScript npm library at `0.1.0`, with ESM, CommonJS, and generated `.d.ts`.
- Signed Ed25519 hash-chain receipt protocol: a prepared receipt is persisted
  before execution, followed by a success/failure receipt after execution.
- Authority, arguments, results, failures, and optional external witness data
  are hashed; optional redacted views are never part of the signing preimage.
- Explicit outbox for final-store failures. A successful side effect returns an
  unresolved item rather than appearing absent, and the ledger prevents a new
  action until `drainOutbox()` restores receipt ordering.
- Portable verification bundles validate signature, hash integrity, contiguous
  sequence, and any unresolved final receipt.
- Static documentation/demo at `dist/site/index.html`, with local browser
  demo, privacy/terms pages, service-worker shell cache, dark treatment, and
  an original 39 KB WebP paper-cut diorama asset.

## Verify

```sh
npm install
npm test
npm run build
npm pack --dry-run
```

`npm test` passed: documented example, fault-injected final-store failure,
and tamper detection. `npm run check` passed. CJS loading was smoke tested.

Local static-site checks against `http://localhost:4173/` passed:

- `verify-url.sh`: title/lang/main/one h1/alt checks, no browser console errors
- Playwright mobile (390px) demo interaction: receipt verified, no page errors
- axe-core Playwright: 0 violations (including serious/critical)
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; LCP 1.4 s, CLS 0

## Notes / known limits

- This package deliberately does not claim exactly-once execution or global
  ordering between independent ledgers. A signed receipt is self-attestation;
  use an external witness appropriate to the deployment's risk model.
- The package never stores private keys. Production callers should supply a
  signer backed by their OS keychain/HSM/KMS and a durable `ReceiptStore`.
- `npm pack` is ready for the factory registry credentials; no publish was run.
