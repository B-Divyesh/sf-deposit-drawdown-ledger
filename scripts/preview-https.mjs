import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.HTTPS_PREVIEW_PORT ?? 4174);
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'retainer-ledger-preview-'));
const keyPath = join(temporaryDirectory, 'key.pem');
const certificatePath = join(temporaryDirectory, 'certificate.pem');
const distDirectory = resolve('dist');
const contentTypes = {
  '.avif': 'image/avif', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json; charset=utf-8', '.webp': 'image/webp',
};

execFileSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath, '-out', certificatePath,
  '-subj', '/CN=deposit-drawdown-ledger.sociobot.in', '-days', '1',
], { stdio: 'ignore' });

createServer({ key: readFileSync(keyPath), cert: readFileSync(certificatePath) }, (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', `https://${request.headers.host}`).pathname);
  const requested = pathname === '/' ? '/index.html' : pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const filePath = resolve(distDirectory, `.${normalize(requested)}`);
  if (!filePath.startsWith(`${distDirectory}/`) || !existsSync(filePath)) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`HTTPS preview listening on ${port}`));
