import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: Object.fromEntries(['/api', '/project-static', '/preview-bridge.js'].map(route => [route, { target: 'http://127.0.0.1:8787', changeOrigin: true }])),
  },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: '../../dist/studio', emptyOutDir: true, target: 'es2022' },
});
