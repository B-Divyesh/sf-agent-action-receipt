import assert from 'node:assert/strict';
import test from 'node:test';
import { ReceiptLedger, createEd25519Signer, createReceiptLedger, verifyBundle } from '../dist/esm/index.js';

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
  const outbox = [];
  const ledger = createReceiptLedger({
    signer, actor: 'agent', store: {
      append: async () => { calls++; if (calls === 2) throw new Error('disk offline'); },
      saveOutbox: async (item) => { outbox.push(item); },
      resolveOutbox: async (item) => { outbox.splice(outbox.indexOf(item), 1); }
    }
  });
  const result = await ledger.execute({ tool: 'send.email', authority: { grant: 'g1' }, args: { to: 'a@example.test' }, run: () => ({ accepted: true }) });
  assert.equal(result.unresolvedOutbox?.reason, 'disk offline');
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.unresolved.length, 1);
  assert.equal(outbox.length, 1);
  assert.equal(verifyBundle(ledger.exportBundle()).ok, true);
  await assert.rejects(() => ledger.execute({ tool: 'later', authority: {}, args: {}, run: () => ({}) }), /outbox/);
});

test('concurrent execute calls are serialized into one verifiable chain', async () => {
  const signer = await createEd25519Signer();
  const ledger = createReceiptLedger({ signer, actor: 'agent' });
  const results = await Promise.all([...Array(8)].map((_, i) => ledger.execute({
    tool: `tool.${i}`, authority: { grant: 'g' }, args: { i },
    run: async () => ({ i })
  })));
  assert.deepEqual(results.map((action) => action.receipt.sequence), [2, 4, 6, 8, 10, 12, 14, 16]);
  assert.deepEqual(ledger.entries.map((receipt) => receipt.sequence), [...Array(16)].map((_, i) => i + 1));
  assert.equal(verifyBundle(ledger.exportBundle()).ok, true);
});

test('durable outbox survives restart and drains into the restored chain', async () => {
  const signer = await createEd25519Signer('durable-key');
  const receipts = [];
  const unresolvedOutbox = [];
  let finalWriteOffline = true;
  const store = {
    append: async (receipt) => {
      if (receipt.status === 'succeeded' && finalWriteOffline) throw new Error('disk offline');
      receipts.push(receipt);
    },
    saveOutbox: async (item) => { unresolvedOutbox.push(item); },
    resolveOutbox: async (item) => {
      receipts.push(item.receipt);
      unresolvedOutbox.splice(unresolvedOutbox.findIndex((candidate) => candidate.receipt.id === item.receipt.id), 1);
    },
    load: async () => ({ receipts: [...receipts], unresolvedOutbox: [...unresolvedOutbox] })
  };
  const firstProcess = createReceiptLedger({ signer, actor: 'agent', store });
  const action = await firstProcess.execute({ tool: 'send.email', authority: { grant: 'g1' }, args: { to: 'a@example.test' }, run: () => ({ accepted: true }) });
  assert.equal(action.unresolvedOutbox?.reason, 'disk offline');
  assert.equal(receipts.length, 1);
  assert.equal(unresolvedOutbox.length, 1);

  const recovered = await ReceiptLedger.restore({ signer, actor: 'agent', store });
  assert.equal(recovered.unresolved.length, 1);
  assert.equal(recovered.verify().ok, true);
  finalWriteOffline = false;
  assert.equal(await recovered.drainOutbox(), 1);
  assert.equal(unresolvedOutbox.length, 0);
  assert.equal(recovered.entries.length, 2);
  assert.equal(recovered.verify().ok, true);
  await recovered.execute({ tool: 'later', authority: { grant: 'g2' }, args: {}, run: () => ({ accepted: true }) });
  assert.deepEqual(recovered.entries.map((receipt) => receipt.sequence), [1, 2, 3, 4]);
  assert.equal(recovered.verify().ok, true);
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
