import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup.ts'],
        include: ['test/**/*.{test,spec}.{js,jsx,ts,tsx}'],
        alias: {
            '@': path.resolve(__dirname, './src')
        },
        deps: {
            inline: [
                'mochimo-wots',
                '@scure/bip39'
            ]
        }
    }
}); 