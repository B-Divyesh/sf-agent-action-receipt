import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const fingerprint = (content) => createHash('sha256').update(content).digest('hex').slice(0, 12);
const asset = async (name) => {
  const content = await readFile(`site/${name}`);
  const extension = name.slice(name.lastIndexOf('.'));
  const stem = name.slice(0, -extension.length);
  const output = `${stem}.${fingerprint(content)}${extension}`;
  await writeFile(`dist/site/assets/${output}`, content);
  return `assets/${output}`;
};

await rm('dist/site', { recursive: true, force: true });
await mkdir('dist/site', { recursive: true });
await mkdir('dist/site/assets', { recursive: true });
const styles = await asset('styles.css');
const app = await asset('app.js');
const image = await readFile('public/receipt-diorama.webp');
const imageName = `receipt-diorama.${fingerprint(image)}.webp`;
await writeFile(`dist/site/assets/${imageName}`, image);
const shell = ['/', '/index.html', '/privacy.html', '/terms.html', `/${styles}`, `/${app}`, `/assets/${imageName}`];
const swTemplate = await readFile('site/sw.js', 'utf8');
const sw = swTemplate
  .replace('__CACHE_NAME__', `agent-action-receipt-${fingerprint(JSON.stringify(shell))}`)
  .replace('__SHELL__', JSON.stringify(shell));
await writeFile('dist/site/sw.js', sw);
for (const name of ['index.html', 'privacy.html', 'terms.html']) {
  let html = await readFile(`site/${name}`, 'utf8');
  html = html.replaceAll('styles.css', styles).replace('app.js', app).replace('assets/receipt-diorama.webp', `assets/${imageName}`);
  await writeFile(`dist/site/${name}`, html);
}
await cp('site/_headers', 'dist/site/_headers');
