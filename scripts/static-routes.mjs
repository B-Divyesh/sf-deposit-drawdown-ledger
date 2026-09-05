import { copyFileSync, mkdirSync } from 'node:fs';

for (const route of ['demo', 'privacy', 'terms']) {
  mkdirSync(`dist/${route}`, { recursive: true });
  copyFileSync('dist/index.html', `dist/${route}/index.html`);
}
