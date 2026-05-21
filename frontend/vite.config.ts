import { defineConfig } from 'vite';
import reactSWC from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [reactSWC()],
  resolve: {
    alias: {
      '@':              path.resolve(__dirname, 'src'),
      '@archon/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api':      { target: 'http://localhost:5000', changeOrigin: true },
      '/generate': { target: 'http://localhost:5000', changeOrigin: true },
      '/health':   { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io':{ target: 'http://localhost:5000', changeOrigin: true, ws: true },
    },
  },
  build: {
    outDir: '../backend/dist-frontend',
    emptyOutDir: true,
  },
});
