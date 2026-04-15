import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

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
    proxy: {
      '/health': 'http://localhost:17777',
      '/capabilities': 'http://localhost:17777',
      '/v1': 'http://localhost:17777',
    },
  },
  build: {
    outDir: '../backend/app/static',
    emptyOutDir: true,
  },
});
