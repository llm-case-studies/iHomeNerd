import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

// Self-signed cert enables mic/camera access from LAN clients
const certsDir = path.resolve(__dirname, '../certs');
const hasCerts = fs.existsSync(path.join(certsDir, 'key.pem'));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    ...(hasCerts && {
      https: {
        key: fs.readFileSync(path.join(certsDir, 'key.pem')),
        cert: fs.readFileSync(path.join(certsDir, 'cert.pem')),
      },
    }),
    proxy: {
      '/health': 'http://localhost:17777',
      '/capabilities': 'http://localhost:17777',
      '/system': 'http://localhost:17777',
      '/sessions': 'http://localhost:17777',
      '/v1': 'http://localhost:17777',
    },
  },
  build: {
    outDir: '../backend/app/static',
    emptyOutDir: true,
  },
});
