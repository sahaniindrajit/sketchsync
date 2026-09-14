import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts'],
    },
});
