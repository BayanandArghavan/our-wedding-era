import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests against a running app (npm run build && npm start) and a
 * local Supabase stack (npx supabase start). Confirmation and reset emails are
 * read from the local mail catcher (Mailpit) that Supabase starts.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
