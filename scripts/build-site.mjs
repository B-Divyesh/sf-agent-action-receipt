import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist/site', { recursive: true, force: true });
await mkdir('dist/site', { recursive: true });
await cp('site', 'dist/site', { recursive: true });
await mkdir('dist/site/assets', { recursive: true });
await cp('public/receipt-diorama.webp', 'dist/site/assets/receipt-diorama.webp');
