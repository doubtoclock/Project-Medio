import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 5173);
const host = "127.0.0.1";

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/._*"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: {
    timeout: 7_500,
  },
  use: {
    baseURL: `http://${host}:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: `npm run dev -- --host ${host} --port ${port}`,
    url: `http://${host}:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      VITE_BACKEND_URL: "http://localhost:5001",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
