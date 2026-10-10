// Servidor local SIN login de Vercel: sirve el sitio estático y enruta /api/*.
// Uso: copia .env.example a .env, rellénalo y ejecuta `npm run dev` (http://localhost:3000).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { // .env mínimo (sin dependencias)
  for (const l of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l);
    if (m && !l.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* sin .env */ }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const port = Number(process.env.PORT) || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(url.pathname);
  if (p.startsWith('/api/')) {
    const name = p.slice(5).replace(/[^a-z0-9-]/gi, '');
    const file = path.join(root, 'api', name + '.js');
    if (!name || !fs.existsSync(file)) { res.statusCode = 404; return res.end('{"ok":false,"codigo":"no_encontrado"}'); }
    try { await (await import(pathToFileURL(file).href)).default(req, res); }
    catch (e) { console.error(e); res.statusCode = 500; res.end('{"ok":false,"codigo":"error_interno"}'); }
    return;
  }
  let f = path.join(root, p);
  if (!f.startsWith(root + path.sep) && f !== root) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('404'); }
  res.setHeader('Content-Type', MIME[path.extname(f).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`Catbling local: http://localhost:${port}/principalpage.html`));
