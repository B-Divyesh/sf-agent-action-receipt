import assert from 'node:assert/strict';
import test from 'node:test';
import { createEd25519Signer, createReceiptLedger, verifyBundle } from '../dist/esm/index.js';

test('documented example creates a verified redacted chain', async () => {
  const signer = await createEd25519Signer('test-key');
  const ledger = createReceiptLedger({ signer, actor: 'deploy-agent' });
  const action = await ledger.execute({
    tool: 'billing.refund', authority: { policy: 'refund-v3', grant: 'case-741' }, externalWitness: { ticket: 'witness_456' },
    args: { invoiceId: 'inv_123', amount: 5000 }, redact: (value) => ({ invoiceId: value.invoiceId }),
    run: async () => ({ refunded: true, providerId: 'r_987' })
  });
  assert.equal(action.receipt.status, 'succeeded');
  assert.equal(ledger.entries.length, 2);
  const bundle = ledger.exportBundle({ includeRedactions: true });
  assert.equal(verifyBundle(bundle).ok, true);
  assert.equal(bundle.receipts[1].redactions?.args?.invoiceId, 'inv_123');
  assert.ok(bundle.receipts[0].witnessHash);
  assert.equal(JSON.stringify(bundle).includes('r_987'), false);
  assert.equal(verifyBundle(ledger.exportBundle()).ok, true);
});

test('a successful effect is explicit in outbox when final persistence fails', async () => {
  const signer = await createEd25519Signer();
  let calls = 0;
  const ledger = createReceiptLedger({
    signer, actor: 'agent', store: { append: async () => { calls++; if (calls === 2) throw new Error('disk offline'); } }
  });
  const result = await ledger.execute({ tool: 'send.email', authority: { grant: 'g1' }, args: { to: 'a@example.test' }, run: () => ({ accepted: true }) });
  assert.equal(result.unresolvedOutbox?.reason, 'disk offline');
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.unresolved.length, 1);
  assert.equal(verifyBundle(ledger.exportBundle()).ok, true);
  await assert.rejects(() => ledger.execute({ tool: 'later', authority: {}, args: {}, run: () => ({}) }), /outbox/);
});

test('tampering with a receipt is detected', async () => {
  const signer = await createEd25519Signer();
  const ledger = createReceiptLedger({ signer, actor: 'agent' });
  await ledger.execute({ tool: 'deploy', authority: {}, args: { version: '1' }, run: () => ({ ok: true }) });
  const bundle = ledger.exportBundle();
  bundle.receipts[1].tool = 'delete-production';
  const checked = verifyBundle(bundle);
  assert.equal(checked.ok, false);
  assert.match(checked.error, /digest mismatch/);
});
