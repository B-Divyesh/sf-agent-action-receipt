# Agent Action Receipt

`@sociobot/agent-action-receipt` creates privacy-preserving, signed,
hash-chained receipts around consequential agent tool calls. It is for teams
that need an independently verifiable record of an action attempt and outcome
without storing prompts, raw arguments, or raw results in the receipt.

It is deliberately not an orchestration framework or hosted ledger. A receipt
proves what its signing key recorded; it does not by itself prove a remote
service actually performed the claimed side effect. Supply a durable receipt
store to make a failed final write explicit across process restarts instead of
silently losing the action.

## Install

```sh
npm install @sociobot/agent-action-receipt
```

## Use it

```ts
import { ReceiptLedger, createEd25519Signer, createReceiptLedger, verifyBundle } from '@sociobot/agent-action-receipt';

const signer = await createEd25519Signer(); // persist key material in your OS/KMS integration
const ledger = createReceiptLedger({ signer, actor: 'deploy-agent' });

const result = await ledger.execute({
  tool: 'billing.refund',
  authority: { policy: 'refund-v3', grant: 'case-741' },
  externalWitness: { ticket: 'witness_456' }, // hashed into the receipt
  args: { invoiceId: 'inv_123', amount: 5000 },
  redact: (value) => ({ invoiceId: value.invoiceId }),
  run: async () => ({ refunded: true, providerId: 'r_987' })
});

console.log(result.receipt.status); // "succeeded"
console.log(ledger.verify());       // { ok: true, ... }
```

The pre-execution receipt is appended before `run`. A final success/failure
receipt is appended after it. Calls to `execute()` on one ledger are serialized
through the entire action, so each ledger has one verifiable total order.

For restart-safe final-write recovery, implement all three methods of
`ReceiptStore` using your database transaction or idempotent write primitive:

```ts
const store = {
  append: async (receipt) => { /* durably insert receipt by receipt.id */ },
  saveOutbox: async (item) => { /* durably insert unresolved item */ },
  resolveOutbox: async (item) => {
    /* atomically insert item.receipt and delete the matching outbox item */
  },
  load: async () => ({ receipts: [], unresolvedOutbox: [] })
};

const ledger = await ReceiptLedger.restore({ signer, actor: 'deploy-agent', store });
const repaired = await ledger.drainOutbox();
```

`ReceiptLedger.restore()` requires a `RecoverableReceiptStore` (a receipt store
with `load`). It rejects a malformed stored chain before a new action can run.
If final receipt persistence fails, `saveOutbox` is attempted before the action
is returned with `unresolvedOutbox`. If both writes fail, the library throws
`OutboxPersistenceError` containing the signed receipt that needs operator
reconciliation; it never reports a durable outbox item it could not save.

Export only the evidence another party needs; arguments and results remain
hashed, and redacted views are opt-in:

```ts
const bundle = ledger.exportBundle({ includeRedactions: true });
const verified = await verifyBundle(bundle);
```

## Ordering and exactly-once limits

Sequence numbers give one ledger a total order. They do not establish a global
order across processes. `execute` cannot make an arbitrary remote tool and a
receipt store atomic, so it cannot promise exactly once. With a durable store,
a successful `run` returns either a verifiable final receipt or a durably
surfaced unresolved outbox item. Store keys with your OS keychain or KMS; the
package only accepts a signer and never writes private keys.

## Local development

```sh
npm install
npm test
npm run build          # package -> dist/, static site -> dist/site/
npm run build:site     # static site -> dist/site/ (index.html at its root)
npm run dev            # local documentation/demo server
npm pack               # ready-to-publish tarball; do not publish from this repo
```

The static demo runs fully in the browser and stores its sample receipt chain
only in memory.

## Project notes

There is no telemetry, remote dependency, payment flow, or user account. See
the static [privacy](site/privacy.html) and [terms](site/terms.html) pages for
the hosted documentation site. The paper-cut hero was generated specifically
for this project with `/opt/fleet/lib/gen-image.sh`: “editorial paper-cut
diorama of a sealed action receipt passing through redaction, hash-chain links,
and a witness seal; layered warm ivory, ledger green, coral, pale blue; no
words, no logos, no watermark.”

MIT licensed. See [LICENSE](LICENSE).
