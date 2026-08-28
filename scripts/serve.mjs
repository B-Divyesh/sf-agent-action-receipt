import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/site/', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp' };
createServer(async (req, res) => {
  const path = normalize(join(root, req.url === '/' ? 'index.html' : decodeURIComponent(req.url || '')));
  if (!path.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    if ((await stat(path)).isDirectory()) throw new Error('directory');
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, () => console.log('Documentation at http://localhost:4173'));
