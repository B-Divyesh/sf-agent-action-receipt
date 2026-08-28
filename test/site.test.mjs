import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import test from 'node:test';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const server = spawn(process.execPath, ['scripts/serve.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk; });
server.stderr.on('data', (chunk) => { serverOutput += chunk; });

test.before(async () => {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch('http://localhost:4173/');
      if (response.ok) return;
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Documentation server did not start: ${serverOutput}`);
});

test.after(async () => {
  if (!server.killed) {
    server.kill();
    await once(server, 'exit');
  }
});

test('documentation site ships hardened immutable assets and works at desktop and 390px', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktop = await desktopContext.newPage();
    const errors = [];
    desktop.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    const response = await desktop.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    assert.equal(response?.headers()['content-security-policy']?.includes("default-src 'self'"), true);
    assert.equal(response?.headers()['permissions-policy']?.includes('camera=()'), true);
    assert.equal(await desktop.locator('html').getAttribute('lang'), 'en');
    assert.equal(await desktop.locator('main').count(), 1);
    assert.equal(await desktop.locator('h1').count(), 1);
    const stylesheet = await desktop.locator('link[rel="stylesheet"]').getAttribute('href');
    assert.match(stylesheet, /^assets\/styles\.[a-f0-9]{12}\.css$/);
    const stylesheetResponse = await desktop.request.get(`http://localhost:4173/${stylesheet}`);
    assert.match(stylesheetResponse.headers()['cache-control'], /immutable/);
    assert.equal(await desktop.locator('.copy').boundingBox().then((box) => box?.height), 44);
    await desktop.locator('.copy').click();
    await assert.doesNotReject(() => desktop.locator('.copy').filter({ hasText: /Copied|Copy unavailable/ }).waitFor());
    await desktop.locator('#tool').fill('');
    await desktop.locator('button[type="submit"]').click();
    assert.equal(await desktop.evaluate(() => document.activeElement?.id), 'tool');
    await desktop.locator('#tool').fill('deploy.release');
    await desktop.locator('#action-form').evaluate((form) => form.requestSubmit());
    await assert.doesNotReject(() => desktop.locator('#verification').waitFor({ state: 'visible' }));
    assert.match(await desktop.locator('#verification').textContent(), /Chain verified locally/);
    const axe = await new AxeBuilder({ page: desktop }).analyze();
    assert.deepEqual(axe.violations, []);
    assert.deepEqual(errors, []);

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobile = await mobileContext.newPage();
    await mobile.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), true);
    await mobile.keyboard.press('Tab');
    assert.equal(await mobile.evaluate(() => document.activeElement?.textContent), 'Skip to main content');
    await mobile.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await mobile.locator('.receipt').count(), 0);
    await mobile.locator('#action-form').evaluate((form) => form.requestSubmit());
    assert.equal(await mobile.locator('.receipt').count(), 2);
    assert.ok(await mobile.locator('.receipt').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration) <= 0.00001));
    await mobile.locator('#result').selectOption('failed');
    await mobile.locator('#action-form').evaluate((form) => form.requestSubmit());
    assert.match(await mobile.locator('#form-status').textContent(), /Failure receipt filed/);
    await mobile.locator('#result').selectOption('outbox');
    await mobile.locator('#action-form').evaluate((form) => form.requestSubmit());
    assert.match(await mobile.locator('#verification').textContent(), /Explicit unresolved outbox item/);
    assert.equal(await mobile.locator('#offline-note').isVisible(), true);
    const mobileAxe = await new AxeBuilder({ page: mobile }).analyze();
    assert.deepEqual(mobileAxe.violations, []);
    await mobile.close();
    await desktop.close();
    await mobileContext.close();
    await desktopContext.close();

    const offlineContext = await browser.newContext();
    const offlinePage = await offlineContext.newPage();
    await offlinePage.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    await offlinePage.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await offlineContext.setOffline(true);
    await offlinePage.reload({ waitUntil: 'domcontentloaded' });
    assert.match(await offlinePage.title(), /Agent Action Receipt/);
    await offlineContext.close();
  } finally {
    await browser.close();
  }
});
