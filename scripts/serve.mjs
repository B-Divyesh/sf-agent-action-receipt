import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/site/', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp' };
createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname);
  const path = normalize(join(root, requested));
  if (!path.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    if ((await stat(path)).isDirectory()) throw new Error('directory');
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; worker-src 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests");
    res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, () => console.log('Documentation at http://localhost:4173'));
