// Post-evaluation diagnostic helper. This is not part of the evaluated app.
// Serve only the fixed replay probe and its source imports, on localhost.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const probes = new Set(['/tools/replay-probe.html', '/tools/replay-probe.mjs']);

export function resolveProbeRequest(pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes('\\') || decoded.includes('\0')) return null;
  if (!probes.has(decoded) && !decoded.startsWith('/src/')) return null;
  const file = resolve(root, `.${decoded}`);
  const rel = relative(root, file);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) return null;
  if (!probes.has(decoded) && (rel.split(sep)[0] !== 'src' || !['.js', '.mjs'].includes(extname(file)))) return null;
  return file;
}

export function makeReplayProbeServer() {
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    let file;
    try { file = resolveProbeRequest(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400); response.end(); return; }
    if (!file) { response.writeHead(403); response.end(); return; }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        'Content-Type': extname(file) === '.html' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store', 'Content-Length': body.length,
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 500);
      response.end();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  makeReplayProbeServer().listen(8766, '127.0.0.1', () =>
    process.stdout.write('Tether replay probe: http://localhost:8766/tools/replay-probe.html\n'));
}
