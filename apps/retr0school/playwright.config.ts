import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: "**/screenshots.spec.ts",
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      testIgnore: "**/screenshots.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "screenshots",
      testMatch: "**/screenshots.spec.ts",
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
});
