import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'mochimo-wallet': path.resolve(__dirname, '../../dist'),
      buffer: 'buffer/',
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util/'
    }
  },
  define: {
    'process.env': {},
    'global': 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', 'process/browser', 'util']
  },
  server: {
    port: 5173,
    strictPort: true,
    open: true
  }
});     