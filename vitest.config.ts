import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['test/**/*.test.ts'],
        setupFiles: ['test/setup.ts'],
        server: {
            deps: {
                inline: [/mochimo-wots-v2/, /@scure\/bip39/]
            }
        }
    }
}); 