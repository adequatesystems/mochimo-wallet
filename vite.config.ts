import { defineConfig } from 'vitest/config';
import path, { resolve } from 'path';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
export default defineConfig({
    plugins: [
        react(),
        dts({
          insertTypesEntry: true,
        }),
      ],
    test: {
        globals: true,
        environment: 'node'
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'MochimoWallet',
          formats: ['es', 'cjs'],
          fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM'
            }
          }
        }
      },
}); 