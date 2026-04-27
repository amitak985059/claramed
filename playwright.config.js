import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    retries: 1,
    reporter: 'html',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ],
    // Start frontend dev server automatically before running E2E
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        cwd: './frontend',
        reuseExistingServer: true,
        timeout: 30000,
    },
})
