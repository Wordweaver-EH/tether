import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

export function resolveRequest(pathname) {
  const decoded = decodeURIComponent(pathname).replaceAll('\\', '/');
  const route = decoded === '/' ? '/client/index.html' : decoded.endsWith('/') ? `${decoded}index.html` : decoded;
  const file = resolve(root, `.${route}`);
  const rel = relative(root, file);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith('/') || rel.startsWith('\\')) return null;
  if (!['client', 'replay', 'src'].includes(rel.split(sep)[0])) return null;
  return file;
}

export function makeServer() {
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    let file;
    try { file = resolveRequest(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400); response.end(); return; }
    if (!file) { response.writeHead(403); response.end(); return; }
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store', 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 500);
      response.end();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  makeServer().listen(8765, '127.0.0.1', () =>
    process.stdout.write('Tether: http://localhost:8765/\n'));
}
