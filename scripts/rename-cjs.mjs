import { rename, readdir } from 'node:fs/promises';
for (const file of await readdir('dist/cjs')) {
  if (file.endsWith('.js')) await rename(`dist/cjs/${file}`, `dist/cjs/${file.slice(0, -3)}.cjs`);
}
