import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..", "..");
const isCi = Boolean(process.env.CI);
const appBaseUrl = process.env.ARENA_BASE_URL ?? "http://127.0.0.1:3000";
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4010";
const roomsBaseUrl = process.env.ROOMS_BASE_URL ?? "http://127.0.0.1:4011";
const browserChannel = process.env.PLAYWRIGHT_CHANNEL;
const appUrl = new URL(appBaseUrl);
const apiUrl = new URL(apiBaseUrl);
const roomsUrl = new URL(roomsBaseUrl);

export default defineConfig({
  testDir: dirname,
  testMatch: ["**/*.smoke.spec.ts"],
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: path.join(dirname, "artifacts", "report"),
      },
    ],
  ],
  outputDir: path.join(dirname, "artifacts", "test-results"),
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: appBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    viewport: { width: 1440, height: 960 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
  ],
  webServer: [
    {
      command: "npm run dev -w @arena/api",
      url: `${apiBaseUrl}/health`,
      cwd: repoRoot,
      timeout: 60_000,
      reuseExistingServer: !isCi,
      env: {
        ...process.env,
        PORT: apiUrl.port || "80",
      },
    },
    {
      command: "npm run dev -w @arena/rooms",
      url: `${roomsBaseUrl}/health`,
      cwd: repoRoot,
      timeout: 60_000,
      reuseExistingServer: !isCi,
      env: {
        ...process.env,
        PORT: roomsUrl.port || "80",
        API_BASE_URL: apiBaseUrl,
      },
    },
    {
      command: `npm run dev -w @arena/web -- --hostname ${appUrl.hostname} --port ${appUrl.port || "80"}`,
      url: `${appBaseUrl}/lobby`,
      cwd: repoRoot,
      timeout: 120_000,
      reuseExistingServer: !isCi,
      env: {
        ...process.env,
        PORT: appUrl.port || "80",
        NEXT_TELEMETRY_DISABLED: "1",
        API_BASE_URL: apiBaseUrl,
        ROOMS_BASE_URL: roomsBaseUrl,
      },
    },
  ],
});
