import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

test('@claim:package-artifact the packed package installs for ESM and CommonJS with types and its MIT license', async () => {
  const root = process.cwd();
  const workspace = await mkdtemp(join(tmpdir(), 'receipt-consumer-'));
  try {
    await writeFile(join(workspace, 'package.json'), JSON.stringify({ name:'receipt-clean-consumer', private:true, type:'module' }));
    const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', workspace], { cwd:root, encoding:'utf8' }));
    const tarball = join(workspace, packed[0].filename);
    execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], { cwd:workspace, stdio:'pipe' });

    const packageRoot = join(workspace, 'node_modules', '@sociobot', 'agent-action-receipt');
    await stat(join(packageRoot, 'dist', 'esm', 'index.d.ts'));
    const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    assert.equal(packageJson.license, 'MIT');
    assert.match(await readFile(join(packageRoot, 'LICENSE'), 'utf8'), /Permission is hereby granted, free of charge/);
    assert.deepEqual(packageJson.dependencies ?? {}, {});

    await writeFile(join(workspace, 'consumer.mjs'), `
      import assert from 'node:assert/strict';
      import http from 'node:http';
      import https from 'node:https';
      import net from 'node:net';
      import { ReceiptFinalizationError, createEd25519Signer, createReceiptLedger, verifyBundle } from '@sociobot/agent-action-receipt';
      const denyNetwork = () => { throw new Error('network access is disabled in this consumer'); };
      globalThis.fetch = denyNetwork;
      http.request = denyNetwork;
      https.request = denyNetwork;
      net.Socket.prototype.connect = denyNetwork;
      const signer = await createEd25519Signer('consumer-key');
      const ledger = createReceiptLedger({ signer, actor:'deploy-agent' });
      const action = await ledger.execute({ tool:'deploy.release', authority:{ grant:'release-42' }, args:{ secret:'not-exported' }, run:async () => ({ token:'not-exported' }) });
      assert.equal(action.receipt.status, 'succeeded');
      assert.equal(verifyBundle(ledger.exportBundle()).ok, true);
      assert.equal(JSON.stringify(ledger.exportBundle()).includes('not-exported'), false);

      const redactionLedger = createReceiptLedger({ signer, actor:'deploy-agent' });
      let redactionEffects = 0;
      const redacted = await redactionLedger.execute({ tool:'mail.send', authority:{ grant:'g' }, args:{}, redactResult:() => { throw new Error('redactor crashed'); }, run:() => { redactionEffects++; return { ok:true }; } });
      assert.equal(redactionEffects, 1);
      assert.equal(redacted.receipt.status, 'succeeded');
      assert.equal(redactionLedger.verify().ok, true);

      const invalidLedger = createReceiptLedger({ signer, actor:'deploy-agent' });
      let invalidEffects = 0;
      await assert.rejects(() => invalidLedger.execute({ tool:'mail.send', authority:{ grant:'g' }, args:{}, run:() => { invalidEffects++; return Number.NaN; } }), (error) => error instanceof ReceiptFinalizationError);
      assert.equal(invalidEffects, 1);
      assert.deepEqual(invalidLedger.entries.map((receipt) => receipt.status), ['prepared', 'unresolved']);
      assert.equal(invalidLedger.verify().ok, true);

      const validSigner = await createEd25519Signer('kms-key');
      let signs = 0;
      const failingSigner = { ...validSigner, sign(message) { if (++signs === 3) throw new Error('KMS offline'); return validSigner.sign(message); } };
      const signerLedger = createReceiptLedger({ signer:failingSigner, actor:'deploy-agent' });
      let signerEffects = 0;
      await assert.rejects(() => signerLedger.execute({ tool:'mail.send', authority:{ grant:'g' }, args:{}, run:() => { signerEffects++; return { ok:true }; } }), (error) => error instanceof ReceiptFinalizationError);
      assert.equal(signerEffects, 1);
      assert.deepEqual(signerLedger.entries.map((receipt) => receipt.status), ['prepared', 'unresolved']);
      assert.equal(signerLedger.verify().ok, true);
    `);
    execFileSync(process.execPath, ['consumer.mjs'], { cwd:workspace, stdio:'pipe' });

    await writeFile(join(workspace, 'consumer.cjs'), `
      const assert = require('node:assert/strict');
      const receipt = require('@sociobot/agent-action-receipt');
      assert.equal(typeof receipt.createReceiptLedger, 'function');
      assert.equal(typeof receipt.ReceiptFinalizationError, 'function');
    `);
    execFileSync(process.execPath, ['consumer.cjs'], { cwd:workspace, stdio:'pipe' });
  } finally {
    await rm(resolve(workspace), { recursive:true, force:true });
  }
});
