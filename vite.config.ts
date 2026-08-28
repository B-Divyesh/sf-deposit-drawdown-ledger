import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  preview: {
    // Exercise the service worker on the production-shaped host in browser tests.
    allowedHosts: ['deposit-drawdown-ledger.sociobot.in'],
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
