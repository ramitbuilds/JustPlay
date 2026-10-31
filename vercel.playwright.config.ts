import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/vercel-browser",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    launchOptions: {
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command: "node tests/vercel-server.mjs",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
  },
  reporter: "list",
});
