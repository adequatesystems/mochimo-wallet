import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MochimoWallet',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'mochimo-wots-v2',
        'crypto-js'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'mochimo-wots-v2': 'MochimoWOTS',
          'crypto-js': 'CryptoJS'
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'jsdom',
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
}); 