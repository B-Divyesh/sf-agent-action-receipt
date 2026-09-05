import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const origin = 'http://localhost:4173';
const server = spawn(process.execPath, ['scripts/serve.mjs'], { stdio:['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
let browser;
server.stdout.on('data', (chunk) => { serverOutput += chunk; });
server.stderr.on('data', (chunk) => { serverOutput += chunk; });

test.before(async () => {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(origin);
      if (response.ok) {
        browser = await chromium.launch({ headless:true });
        return;
      }
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Documentation server did not start: ${serverOutput}`);
});

test.after(async () => {
  await browser?.close();
  if (!server.killed) {
    server.kill();
    await once(server, 'exit');
  }
});

const watchErrors = (page) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  return errors;
};

test('landing and every public route provide the documented structure, metadata, targets, and error page', async () => {
  const context = await browser.newContext({ viewport:{ width:1440, height:900 }, colorScheme:'light' });
  const page = await context.newPage();
  const errors = watchErrors(page);
  const response = await page.goto(`${origin}/`, { waitUntil:'networkidle' });
  assert.match(response?.headers()['content-security-policy'] ?? '', /default-src 'self'/);
  assert.match(response?.headers()['permissions-policy'] ?? '', /camera=\(\)/);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.title(), 'Agent Action Receipt — Record consequential actions');
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('h1').count(), 1);
  assert.match(await page.locator('h1').textContent(), /^Record every consequential agent action$/);
  assert.equal(await page.locator('a', { hasText:'Try it with sample data' }).getAttribute('href'), '/demo');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://agent-action-receipt.sociobot.in/');
  assert.equal(await page.locator('meta[property="og:image"]').count(), 1);
  const stylesheet = await page.locator('link[rel="stylesheet"]').getAttribute('href');
  assert.match(stylesheet, /^\/assets\/styles\.[a-f0-9]{12}\.css$/);
  const stylesheetResponse = await page.request.get(`${origin}${stylesheet}`);
  assert.match(stylesheetResponse.headers()['cache-control'], /immutable/);
  assert.equal((await page.request.get(`${origin}/favicon.ico`)).status(), 200);
  assert.ok((await page.locator('.copy').boundingBox()).height >= 44);
  await page.locator('.copy').click();
  await page.locator('.copy').filter({ hasText:/Copied|Copy unavailable/ }).waitFor();
  const landingAxe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(landingAxe.violations, []);

  for (const [path, title] of [['/demo', 'Demo — Agent Action Receipt'], ['/privacy', 'Privacy — Agent Action Receipt'], ['/terms', 'Terms — Agent Action Receipt']]) {
    const routeResponse = await page.goto(`${origin}${path}`, { waitUntil:'networkidle' });
    assert.equal(routeResponse?.status(), 200);
    assert.equal(await page.title(), title);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('main').count(), 1);
    assert.equal(await page.locator('footer').count(), 1);
  }

  assert.deepEqual(errors, []);
  const missingErrorCount = errors.length;
  const missing = await page.goto(`${origin}/not-a-real-page`, { waitUntil:'networkidle' });
  assert.equal(missing?.status(), 404);
  assert.equal(await page.title(), 'Page not found — Agent Action Receipt');
  assert.equal(await page.locator('h1').textContent(), 'Return to the receipt documentation');
  assert.equal(await page.locator('a', { hasText:'Open the documentation' }).getAttribute('href'), '/');
  assert.deepEqual(errors.slice(missingErrorCount), ['Failed to load resource: the server responded with a status of 404 (Not Found)']);
  await context.close();
});

test('@claim:demo-sandbox the one-click sample is populated, isolated, resettable, keyboard usable, and mobile safe', async () => {
  const context = await browser.newContext({ viewport:{ width:390, height:844 }, colorScheme:'dark' });
  const requests = [];
  context.on('request', (request) => requests.push(new URL(request.url()).origin));
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto(`${origin}/`, { waitUntil:'networkidle' });
  await page.locator('a', { hasText:'Try it with sample data' }).click();
  await page.waitForURL(`${origin}/demo`);
  assert.match(await page.locator('.demo-banner').textContent(), /Demo — sample data, nothing is saved/);
  assert.equal(await page.locator('.receipt').count(), 2);
  assert.match(await page.locator('#verification').textContent(), /2 linked sample records/);
  assert.equal(await page.locator('#tool').inputValue(), 'billing.refund');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), true);

  const targets = await page.locator('a:visible,button:visible,input:visible,select:visible').evaluateAll((elements) => elements.map((element) => ({ text:(element.textContent || element.getAttribute('aria-label') || element.id).trim(), width:element.getBoundingClientRect().width, height:element.getBoundingClientRect().height })));
  assert.deepEqual(targets.filter((target) => target.width < 44 || target.height < 44), []);

  await page.locator('#tool').fill('x'.repeat(500));
  await page.locator('#action-form').evaluate((form) => form.requestSubmit());
  assert.equal((await page.locator('#tool').inputValue()).length, 120);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), true);
  assert.ok((await page.locator('.receipt').last().boundingBox()).width <= 350);

  await page.locator('#reset-demo').click();
  assert.equal(await page.locator('.receipt').count(), 2);
  assert.equal(await page.locator('#tool').inputValue(), 'billing.refund');
  assert.match(await page.locator('#form-status').textContent(), /Sample restored/);

  await page.locator('#result').selectOption('failed');
  await page.locator('#action-form').evaluate((form) => form.requestSubmit());
  assert.match(await page.locator('#form-status').textContent(), /Failure receipt created/);
  assert.match(await page.locator('.receipt').last().textContent(), /FAILED/);

  await page.locator('#reset-demo').click();
  await page.locator('#result').selectOption('outbox');
  await page.locator('#action-form').evaluate((form) => form.requestSubmit());
  assert.match(await page.locator('#verification').textContent(), /Explicit unresolved outbox item/);
  assert.equal(await page.locator('#offline-note').isVisible(), true);
  assert.equal(await page.locator('button[type="submit"]').isDisabled(), true);
  const outboxDarkAxe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(outboxDarkAxe.violations, []);

  await page.locator('#reset-demo').click();
  await page.locator('#tool').fill('');
  await page.locator('button[type="submit"]').click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'tool');
  await page.reload({ waitUntil:'networkidle' });
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Skip to main content');

  await page.emulateMedia({ reducedMotion:'reduce', colorScheme:'dark' });
  assert.ok(await page.locator('.receipt').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration) <= 0.00001));
  const darkAxe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(darkAxe.violations, []);
  await page.locator('.theme').click();
  const explicitDarkAxe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(explicitDarkAxe.violations, []);

  assert.equal(await page.evaluate(() => localStorage.length), 0);
  assert.equal(await page.evaluate(() => sessionStorage.length), 0);
  assert.deepEqual([...new Set(requests)], [origin]);
  assert.deepEqual(errors, []);
  await context.close();
});

test('@claim:offline-reload the sample reloads offline after the first visit', async () => {
  const context = await browser.newContext({ viewport:{ width:390, height:844 } });
  const page = await context.newPage();
  await page.goto(`${origin}/demo`, { waitUntil:'networkidle' });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload({ waitUntil:'domcontentloaded' });
  assert.equal(await page.title(), 'Demo — Agent Action Receipt');
  assert.equal(await page.locator('.receipt').count(), 2);
  assert.match(await page.locator('#connection-status').textContent(), /Offline/);
  await context.close();
});

test('a v2 service worker deletes v1 and serves the new shell offline', async () => {
  const template = await readFile('site/sw.js', 'utf8');
  let version = 1;
  const updateServer = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-cache');
    if (request.url === '/sw.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(template.replace('__CACHE_NAME__', `agent-action-receipt-sim-v${version}`).replace('__SHELL__', JSON.stringify(['/', '/index.html'])));
      return;
    }
    response.setHeader('Content-Type', 'text/html');
    response.end(`<!doctype html><html lang="en"><head><title>UPDATED V${version}</title></head><body><main><h1>Version ${version}</h1></main><script>navigator.serviceWorker.register('/sw.js')</script></body></html>`);
  });
  updateServer.listen(0, '127.0.0.1');
  await once(updateServer, 'listening');
  const address = updateServer.address();
  const updateOrigin = `http://127.0.0.1:${address.port}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(updateOrigin, { waitUntil:'networkidle' });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    assert.equal(await page.title(), 'UPDATED V1');
    version = 2;
    const changed = page.evaluate(() => new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once:true })));
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration.update()));
    await changed;
    await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
    assert.deepEqual(await page.evaluate(() => caches.keys()), ['agent-action-receipt-sim-v2']);
    await context.setOffline(true);
    await page.reload({ waitUntil:'domcontentloaded' });
    assert.equal(await page.title(), 'UPDATED V2');
  } finally {
    await context.close();
    updateServer.close();
    await once(updateServer, 'close');
  }
});
