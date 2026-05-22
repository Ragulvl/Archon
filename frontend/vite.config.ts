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

  // ─── Dev server with proxy to local backend ─────────────────────────────────
  server: {
    port: 5173,
    proxy: {
      '/api':       { target: 'http://localhost:5000', changeOrigin: true },
      '/generate':  { target: 'http://localhost:5000', changeOrigin: true },
      '/health':    { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', changeOrigin: true, ws: true },
    },
  },

  // ─── Production build ────────────────────────────────────────────────────────
  build: {
    // Output to frontend/dist — Nginx serves from here (or deploy script copies it)
    outDir: 'dist',
    emptyOutDir: true,

    // Raise chunk size warning threshold (AI app has large deps)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Split large dependencies into separate chunks for better caching
        manualChunks: {
          vendor:  ['react', 'react-dom', 'react-router-dom'],
          socket:  ['socket.io-client'],
          motion:  ['framer-motion'],
        },
      },
    },
  },

  // ─── Env variable prefix ─────────────────────────────────────────────────────
  // Only variables prefixed with VITE_ are exposed to the browser bundle
  envPrefix: 'VITE_',
});
