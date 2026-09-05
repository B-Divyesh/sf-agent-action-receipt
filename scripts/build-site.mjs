import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const fingerprint = (content) => createHash('sha256').update(content).digest('hex').slice(0, 12);
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

await rm('dist/site', { recursive:true, force:true });
await mkdir('dist/site/assets', { recursive:true });

const asset = async (source, name) => {
  const content = await readFile(source);
  const extension = name.slice(name.lastIndexOf('.'));
  const stem = name.slice(0, -extension.length);
  const output = `${stem}.${fingerprint(content)}${extension}`;
  await writeFile(`dist/site/assets/${output}`, content);
  return `assets/${output}`;
};

const styles = await asset('site/styles.css', 'styles.css');
const app = await asset('site/app.js', 'app.js');
const image = await asset('public/receipt-diorama.webp', 'receipt-diorama.webp');
const openGraph = await asset('public/og-receipt.png', 'og-receipt.png');
const pages = ['index.html', 'demo.html', 'privacy.html', 'terms.html', '404.html'];
const pageContents = [];

for (const name of pages) {
  let html = await readFile(`site/${name}`, 'utf8');
  html = html
    .replaceAll('/styles.css', `/${styles}`)
    .replaceAll('/app.js', `/${app}`)
    .replaceAll('/assets/receipt-diorama.webp', `/${image}`)
    .replaceAll('/assets/og-receipt.png', `/${openGraph}`)
    .replaceAll('__VERSION__', packageJson.version);
  pageContents.push(html);
  await writeFile(`dist/site/${name}`, html);
}

for (const name of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) await cp(`public/${name}`, `dist/site/${name}`);
for (const name of ['robots.txt', 'sitemap.xml']) await cp(`site/${name}`, `dist/site/${name}`);
await cp('site/_headers', 'dist/site/_headers');
await cp('site/staticwebapp.config.json', 'dist/site/staticwebapp.config.json');

const shell = ['/', '/index.html', '/demo', '/demo.html', '/privacy', '/privacy.html', '/terms', '/terms.html', `/${styles}`, `/${app}`, `/${image}`, '/favicon.svg'];
const swTemplate = await readFile('site/sw.js', 'utf8');
const cacheVersion = fingerprint(swTemplate + JSON.stringify(shell) + pageContents.join(''));
const sw = swTemplate
  .replace('__CACHE_NAME__', `agent-action-receipt-${cacheVersion}`)
  .replace('__SHELL__', JSON.stringify(shell));
await writeFile('dist/site/sw.js', sw);
