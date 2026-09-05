import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = 4175;
const root = join(process.cwd(), 'dist');
let workerVersion = 'qa-a';

const mime = {
  '.avif': 'image/avif', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.xml': 'application/xml; charset=utf-8',
};

function send(response, status, body, type = 'text/plain; charset=utf-8', headers = {}) {
  response.writeHead(status, { 'Content-Type': type, ...headers });
  response.end(body);
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  if (url.pathname === '/__qa-worker-version') {
    const next = url.searchParams.get('version');
    if (next === 'qa-a' || next === 'qa-b') workerVersion = next;
    return send(response, 200, workerVersion, 'text/plain; charset=utf-8', { 'Cache-Control': 'no-store' });
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  if (requestedPath === '/sw.js') {
    const source = await readFile(join(root, 'sw.js'), 'utf8');
    return send(response, 200, source.replace('retainer-ledger-v1.1.0', `retainer-ledger-${workerVersion}`), 'application/javascript; charset=utf-8', { 'Cache-Control': 'no-cache' });
  }

  const safePath = normalize(requestedPath).replace(/^([.][.][/\\])+/, '');
  const candidates = [join(root, safePath), join(root, safePath, 'index.html')];
  for (const file of candidates) {
    try {
      const body = await readFile(file);
      return send(response, 200, body, mime[extname(file)] ?? 'application/octet-stream');
    } catch { /* try the next path */ }
  }

  // Match the product's SPA fallback for product routes such as /demo.
  if (!extname(requestedPath)) return send(response, 200, await readFile(join(root, 'index.html')), 'text/html; charset=utf-8');
  return send(response, 404, 'Not found');
}).listen(port, '127.0.0.1');
