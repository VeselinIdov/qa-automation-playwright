import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

export const enum EnvironmentTarget {
    DEFAULT = 'dev',
}

const ENV = process.env.TEST_ENV || EnvironmentTarget.DEFAULT
dotenv.config({
    path: path.resolve(__dirname, `profiles/.env.${ENV}`),
    quiet: true,
})

if (!process.env.UI_URL) {
    throw new Error(`Environment variable 'UI_URL' is not set in profiles/.env.${ENV}`)
}

if (!process.env.API_URL) {
    throw new Error(`Environment variable 'API_URL' is not set in profiles/.env.${ENV}`)
}

export default defineConfig({
    testDir: './tests/',
    /* Run tests in files in parallel */
    fullyParallel: false,
    /* Retry on CI only */
    retries: process.env.CI ? 1 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 2 : 3, // Disable parallelism
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['allure-playwright', { outputFolder: 'allure-results', detail: true, suiteTitle: true }],
        ['junit', { outputFile: 'results.xml' }],
    ],
    timeout: 15000,
    expect: { timeout: 15000 },
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        headless: true,
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: process.env.UI_URL, // Dynamically loaded from .env file
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    /* Configure projects for major browsers */
    projects: [
        { name: 'setup', testMatch: /auth\.setup\.ts/, workers: 1 },

        {
            name: 'ui',
            dependencies: ['setup'],
            testIgnore: /api\/.*\.test\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/user.json',
            },
        },
        {
            name: 'api',
            testMatch: /api\/.*\.test\.ts/,
            use: {
                baseURL: process.env.API_URL,
                extraHTTPHeaders: {
                    'Content-Type': 'application/json',
                },
            },
        },
        // {
        //   name: 'edge',
        //   dependencies: ['setup'],
        //   use: { ...devices['Desktop Edge'], storageState: 'playwright/.auth/user.json' }
        // },
        // {
        //   name: 'firefox',
        //   dependencies: ['setup'],
        //   use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' }
        // }
    ],
})
