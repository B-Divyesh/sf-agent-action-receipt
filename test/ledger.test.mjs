import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OutboxPersistenceError,
  ReceiptFinalizationError,
  ReceiptLedger,
  createEd25519Signer,
  createReceiptLedger,
  verifyBundle
} from '../dist/esm/index.js';

test('@claim:private-signed-bundle documented example creates a verified redacted chain without raw results', async () => {
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

test('@claim:receipt-invariant every post-effect finalization path leaves verifiable evidence or an explicit outbox item', async (t) => {
  await t.test('argument redaction failure prevents the action', async () => {
    const signer = await createEd25519Signer();
    const ledger = createReceiptLedger({ signer, actor: 'agent' });
    let effects = 0;
    await assert.rejects(() => ledger.execute({
      tool: 'send.email', authority: { grant: 'g1' }, args: { to: 'a@example.test' },
      redact: () => { throw new Error('argument redactor crashed'); },
      run: () => { effects++; return { accepted: true }; }
    }), /before tool execution/);
    assert.equal(effects, 0);
    assert.equal(ledger.entries.length, 0);
  });

  await t.test('result redaction failure keeps the signed success receipt', async () => {
    const signer = await createEd25519Signer();
    const ledger = createReceiptLedger({ signer, actor: 'agent' });
    let effects = 0;
    const action = await ledger.execute({
      tool: 'send.email', authority: { grant: 'g1' }, args: { to: 'a@example.test' },
      redactResult: () => { throw new Error('result redactor crashed'); },
      run: () => { effects++; return { accepted: true }; }
    });
    assert.equal(effects, 1);
    assert.equal(action.receipt.status, 'succeeded');
    assert.match(action.redactionWarnings?.[0] ?? '', /result redactor crashed/);
    assert.deepEqual(ledger.entries.map((receipt) => receipt.status), ['prepared', 'succeeded']);
    assert.equal(ledger.unresolved.length, 0);
    assert.equal(ledger.verify().ok, true);
  });

  await t.test('an invalid runtime result appends the pre-signed unresolved receipt', async () => {
    const signer = await createEd25519Signer();
    const ledger = createReceiptLedger({ signer, actor: 'agent' });
    let effects = 0;
    await assert.rejects(() => ledger.execute({
      tool: 'send.email', authority: { grant: 'g1' }, args: { to: 'a@example.test' },
      run: () => { effects++; return Number.NaN; }
    }), (error) => error instanceof ReceiptFinalizationError && error.receipt.status === 'unresolved');
    assert.equal(effects, 1);
    assert.deepEqual(ledger.entries.map((receipt) => receipt.status), ['prepared', 'unresolved']);
    assert.equal(ledger.unresolved.length, 0);
    assert.equal(ledger.verify().ok, true);
  });

  await t.test('a signer failure before the fallback is signed prevents the action', async () => {
    const validSigner = await createEd25519Signer();
    let signCalls = 0;
    const signer = { ...validSigner, sign(message) { if (++signCalls === 2) throw new Error('KMS offline'); return validSigner.sign(message); } };
    const ledger = createReceiptLedger({ signer, actor: 'agent' });
    let effects = 0;
    await assert.rejects(() => ledger.execute({
      tool: 'send.email', authority: { grant: 'g1' }, args: {},
      run: () => { effects++; return { accepted: true }; }
    }), /KMS offline/);
    assert.equal(effects, 0);
    assert.equal(ledger.entries.length, 0);
    assert.equal(ledger.unresolved.length, 0);
  });

  await t.test('a signer failure after the action appends the pre-signed unresolved receipt', async () => {
    const validSigner = await createEd25519Signer();
    let signCalls = 0;
    const signer = { ...validSigner, sign(message) { if (++signCalls === 3) throw new Error('KMS offline'); return validSigner.sign(message); } };
    const ledger = createReceiptLedger({ signer, actor: 'agent' });
    let effects = 0;
    await assert.rejects(() => ledger.execute({
      tool: 'send.email', authority: { grant: 'g1' }, args: {},
      run: () => { effects++; return { accepted: true }; }
    }), (error) => error instanceof ReceiptFinalizationError && !error.unresolvedOutbox);
    assert.equal(effects, 1);
    assert.deepEqual(ledger.entries.map((receipt) => receipt.status), ['prepared', 'unresolved']);
    assert.equal(ledger.unresolved.length, 0);
    assert.equal(ledger.verify().ok, true);
  });

  await t.test('a failed fallback append is saved to the durable outbox', async () => {
    const validSigner = await createEd25519Signer('durable-fallback');
    let signCalls = 0;
    const signer = { ...validSigner, sign(message) { if (++signCalls === 3) throw new Error('KMS offline'); return validSigner.sign(message); } };
    const receipts = [];
    const durableOutbox = [];
    const store = {
      append: async (receipt) => {
        if (receipt.status === 'unresolved') throw new Error('receipt disk offline');
        receipts.push(receipt);
      },
      saveOutbox: async (item) => { durableOutbox.push(item); },
      resolveOutbox: async () => {}
    };
    const ledger = createReceiptLedger({ signer, actor: 'agent', store });
    let effects = 0;
    await assert.rejects(() => ledger.execute({
      tool: 'send.email', authority: { grant: 'g1' }, args: {},
      run: () => { effects++; return { accepted: true }; }
    }), (error) => error instanceof ReceiptFinalizationError && error.unresolvedOutbox?.receipt.status === 'unresolved');
    assert.equal(effects, 1);
    assert.deepEqual(receipts.map((receipt) => receipt.status), ['prepared']);
    assert.equal(durableOutbox.length, 1);
    assert.equal(ledger.unresolved.length, 1);
    assert.equal(ledger.verify().ok, true);
  });

  await t.test('a failed fallback and outbox write returns the signed evidence to the caller', async () => {
    const signer = await createEd25519Signer();
    const ledger = createReceiptLedger({ signer, actor: 'agent', store: {
      append: async (receipt) => { if (receipt.status !== 'prepared') throw new Error('receipt disk offline'); },
      saveOutbox: async () => { throw new Error('outbox disk offline'); },
      resolveOutbox: async () => {}
    } });
    let effects = 0;
    await assert.rejects(() => ledger.execute({
      tool: 'send.email', authority: { grant: 'g1' }, args: {},
      run: () => { effects++; return Number.NaN; }
    }), (error) => error instanceof ReceiptFinalizationError
      && error.persistenceError instanceof OutboxPersistenceError
      && error.receipt.status === 'unresolved');
    assert.equal(effects, 1);
    assert.deepEqual(ledger.entries.map((receipt) => receipt.status), ['prepared']);
    assert.equal(ledger.unresolved.length, 0);
  });
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

test('@claim:ledger-order concurrent execute calls are serialized into one verifiable chain', async () => {
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

test('@claim:restart-recovery durable outbox survives restart and drains into the restored chain', async () => {
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

test('@claim:tamper-detection tampering with a receipt is detected', async () => {
  const signer = await createEd25519Signer();
  const ledger = createReceiptLedger({ signer, actor: 'agent' });
  await ledger.execute({ tool: 'deploy', authority: {}, args: { version: '1' }, run: () => ({ ok: true }) });
  const bundle = ledger.exportBundle();
  bundle.receipts[1].tool = 'delete-production';
  const checked = verifyBundle(bundle);
  assert.equal(checked.ok, false);
  assert.match(checked.error, /digest mismatch/);
});
