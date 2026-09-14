import { defineConfig, devices } from '@playwright/test';

/** E2E_PROD=1 runs against production builds (compiled backend + `vite build` output). */
const PROD = !!process.env.E2E_PROD;
const BACKEND_PORT = PROD ? 3200 : 3100;
const FRONTEND_PORT = PROD ? 5274 : 5174;

export default defineConfig({
    testDir: './e2e',
    timeout: 45_000,
    fullyParallel: false,
    workers: 1,
    reporter: [['list']],
    use: {
        baseURL: `http://localhost:${FRONTEND_PORT}`,
        viewport: { width: 1400, height: 900 },
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } } }],
    webServer: [
        {
            command: PROD ? 'npm run build && node dist/index.js' : `node --import tsx src/index.ts`,
            cwd: '../sketchsync-Backend',
            url: `http://127.0.0.1:${BACKEND_PORT}/ping`,
            env: { PORT: String(BACKEND_PORT), CORS_ORIGINS: `http://localhost:${FRONTEND_PORT}`, FRONTEND_URL: `http://localhost:${FRONTEND_PORT}` },
            reuseExistingServer: false,
            timeout: 90_000,
        },
        {
            // `--mode test` keeps the store debug hook that the tests use; everything else is a production build.
            command: PROD ? `npx vite build --mode test && npx vite preview --port ${FRONTEND_PORT} --strictPort` : `npx vite --port ${FRONTEND_PORT} --strictPort`,
            url: `http://localhost:${FRONTEND_PORT}`,
            env: { VITE_BACKEND_URL: `http://127.0.0.1:${BACKEND_PORT}` },
            reuseExistingServer: false,
            timeout: 180_000,
        },
    ],
});
