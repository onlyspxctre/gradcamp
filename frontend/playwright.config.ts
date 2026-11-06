import { defineConfig } from "@playwright/test"

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    workers: 2,
    timeout: 60_000,
    expect: { timeout: 5_000 },
    reporter: "list",
    use: {
        baseURL: "http://127.0.0.1:4173",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? {
                  executablePath:
                      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
              }
            : {},
    },
    projects: [
        { name: "desktop", use: { viewport: { width: 1440, height: 1050 } } },
        {
            name: "short-desktop",
            use: { viewport: { width: 1440, height: 900 } },
        },
        { name: "laptop", use: { viewport: { width: 1024, height: 768 } } },
        { name: "tablet", use: { viewport: { width: 768, height: 900 } } },
        { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
        {
            name: "narrow-mobile",
            use: { viewport: { width: 320, height: 700 } },
        },
    ],
    webServer: {
        command: process.env.FRONTEND_PREVIEW
            ? "HOST=127.0.0.1 PORT=4173 bun run preview"
            : "HOST=127.0.0.1 PORT=4173 bun run dev",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI && !process.env.FRONTEND_PREVIEW,
    },
})
