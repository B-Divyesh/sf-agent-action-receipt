# Agent Action Receipt

`@sociobot/agent-action-receipt` records signed, hash-chained evidence around consequential agent tool calls.

It is for teams that give agents real tool access. Receipts retain hashes instead of raw arguments and results.

This package is not an agent framework or a hosted ledger. A receipt proves what its signing key recorded.

## Install

```sh
npm install @sociobot/agent-action-receipt
```

The package supports ESM, CommonJS, and TypeScript declarations on Node.js 18 or newer.

## Record an action

```ts
import {
  createEd25519Signer,
  createReceiptLedger,
  verifyBundle
} from '@sociobot/agent-action-receipt';

const signer = await createEd25519Signer();
const ledger = createReceiptLedger({ signer, actor: 'deploy-agent' });

const action = await ledger.execute({
  tool: 'billing.refund',
  authority: { policy: 'refund-v3', grant: 'case-741' },
  externalWitness: { ticket: 'witness_456' },
  args: { invoiceId: 'inv_123', amount: 5000 },
  redact: (value) => ({ invoiceId: value.invoiceId }),
  run: async () => ({ refunded: true, providerId: 'r_987' })
});

console.log(action.receipt.status); // "succeeded"
console.log(ledger.verify());       // { ok: true, ... }
```

Calls on one ledger run in order. Concurrent calls therefore produce one contiguous receipt chain.

## Handle finalization failures

The ledger signs a prepared receipt and an unresolved fallback before calling `run`.

If either signature fails, the tool does not run. The prepared receipt is stored before the tool starts.

After the tool returns, the ledger hashes its result and signs the exact outcome.

If result hashing or signing fails, the pre-signed fallback is appended instead. The call throws `ReceiptFinalizationError` with that evidence.

If fallback append also fails, the ledger saves the fallback in the outbox. Its error exposes the unresolved item.

A result-redaction callback cannot block the signed result. Its error appears in `redactionWarnings`, and the redacted view is omitted.

The ledger reads every execution option before calling `run`. A throwing property accessor therefore prevents the tool from running.

Argument redaction runs before the tool. A failed argument redaction therefore prevents the action.

## Restore a durable outbox

Implement each `ReceiptStore` method with a durable transaction or idempotent write.

```ts
const store = {
  append: async (receipt) => { /* insert by receipt.id */ },
  saveOutbox: async (item) => { /* insert unresolved item */ },
  resolveOutbox: async (item) => {
    /* atomically insert item.receipt and delete the outbox item */
  },
  load: async () => ({ receipts: [], unresolvedOutbox: [] })
};

const ledger = await ReceiptLedger.restore({
  signer,
  actor: 'deploy-agent',
  store
});

await ledger.drainOutbox();
```

`ReceiptLedger.restore()` verifies stored receipts before accepting another action.

If both receipt and outbox writes fail, `OutboxPersistenceError` carries the signed receipt for operator reconciliation.

## Export and verify

```ts
const bundle = ledger.exportBundle({ includeRedactions: true });
const verification = verifyBundle(bundle);
```

The verifier checks receipt hashes, Ed25519 signatures, sequence order, chain links, and unresolved outbox entries. Malformed input returns `{ ok: false }` instead of throwing.

Redacted views are optional presentation data. They are excluded from the signature and exported only when requested.

## Limits

Sequence numbers order one ledger. They do not create global ordering across separate processes.

The package cannot make a remote tool and receipt store atomic. It does not promise exactly-once execution.

Use an OS keychain, HSM, or KMS for long-lived keys. The package never writes private keys.

Use an external witness when reviewers need evidence beyond the signing process.

## Try the sample

Open [the browser sample](https://agent-action-receipt.sociobot.in/demo).

It starts with a realistic refund receipt. The sample stays in page memory and resets without changing real data.

After the first visit, the sample reloads offline. It does not execute a real tool call.

## Develop and verify

From a clean checkout:

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

`npm run build` writes ESM, CommonJS, declarations, and the static site to `dist/`.

The package has no production dependencies, telemetry, remote service, payment flow, or user account.

## Deploy the documentation site

The factory deploys `dist/site`. Do not publish or deploy with personal credentials.

```sh
npm run build
/opt/fleet/lib/deploy-static.sh agent-action-receipt dist/site
```

The generated site includes cache-versioned assets, strict response headers, route metadata, and an updating offline shell.

## Asset provenance

The paper-cut illustration was generated for this project with `/opt/fleet/lib/gen-image.sh`.

Prompt: “editorial paper-cut diorama of a sealed action receipt passing through redaction, hash-chain links, and a witness seal; layered warm ivory, ledger green, coral, pale blue; no words, no logos, no watermark.”

The favicon is an original SVG receipt mark. Its raster variants were rendered locally with ImageMagick.

The Open Graph image is a 1200×630 crop of the original paper-cut illustration.

MIT licensed. See [LICENSE](LICENSE).
