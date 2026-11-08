import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  // Run tests in files in parallel
  fullyParallel: true,
  // Fail the build if test fails
  failFast: true,
  // Retry on CI only
  retries: 0,
  // Opt into the new test runner
  workers: undefined,
  // Reporter to use. Default is list
  reporter: [['list'], ['html']],
  // Shared setup before all tests
  // use: {
  //   baseURL: 'http://127.0.0.1:5173',
  //   trace: 'on-first-retry',
  // },
  projects: [
    {
      name: 'Chromium',
      use: {
        ...devices['Desktop Chrome'],
        // baseURL: 'http://127.0.0.1:5173',
      },
    },
    {
      name: 'Firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'WebKit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
});