import { test, expect } from "@playwright/test"

for (const scenario of [
    { action: "button", status: "Accepted" },
    { action: "shortcut", status: "Wrong Answer" },
    { action: "context menu", status: "Compile Error" },
] as const) {
    test(`Submit via ${scenario.action} reports ${scenario.status} and records one submission`, async ({
        page,
    }) => {
        const uploads: string[] = []
        let finishGrading!: () => void
        const grading = new Promise<void>((resolve) => {
            finishGrading = resolve
        })
        await page.route("**/upload?job=*", async (route) => {
            expect(route.request().method()).toBe("POST")
            uploads.push(route.request().postData() ?? "")
            await route.fulfill({ status: 200, body: "OK" })
        })
        await page.route("**/fetch?job=*", async (route) => {
            await grading
            await route.fulfill({
                json:
                    scenario.status === "Compile Error"
                        ? { status: "failed", error: "Compiler diagnostic" }
                        : {
                              status: "completed",
                              results: {
                                  tests: [
                                      { name: "First test", passed: true },
                                      {
                                          name: "Second test",
                                          passed:
                                              scenario.status === "Accepted",
                                      },
                                  ],
                              },
                          },
            })
        })

        await page.goto("/")
        const workspace = page.getByRole("region", { name: "Coding workspace" })
        const submit = workspace.getByRole("button", {
            name: "Submit",
            exact: true,
        })
        await expect(submit).toBeVisible()
        await expect(
            workspace.getByRole("button", { name: /^Run/i })
        ).toHaveCount(0)
        await expect(
            workspace.getByRole("button", { name: "Test Result", exact: true })
        ).toHaveCount(0)
        // The former Run shortcut must not upload or change the console.
        await page.keyboard.press("Control+Quote")
        await expect(
            workspace.getByRole("button", { name: "Test cases", exact: true })
        ).toBeVisible()
        expect(uploads).toHaveLength(0)

        try {
            if (scenario.action === "button") await submit.click()
            else if (scenario.action === "shortcut")
                await page.keyboard.press("Control+Enter")
            else {
                await submit.click({ button: "right" })
                await expect(
                    page.getByRole("menuitem", { name: /Run/i })
                ).toHaveCount(0)
                await page
                    .getByRole("menuitem", { name: /Submit Solution/ })
                    .click()
            }
            await expect(
                workspace.getByRole("button", {
                    name: "Submitting…",
                    exact: true,
                })
            ).toBeDisabled()
            await expect.poll(() => uploads.length).toBe(1)
            expect(uploads[0]).toContain("int add(int a, int b)")
            // Repeated submission shortcuts cannot enqueue a second job while busy.
            await page.keyboard.press("Control+Enter")
        } finally {
            finishGrading()
        }

        const consoleResult = workspace
            .locator(".console-body")
            .getByRole("region", { name: "Submission result" })
        await expect(
            consoleResult.getByText(scenario.status, { exact: true })
        ).toBeVisible()
        await expect(submit).toBeEnabled()

        await workspace.getByRole("tab", { name: /^Submissions/ }).click()
        const detailsPanel = workspace.getByRole("tabpanel")
        await detailsPanel.getByText(scenario.status, { exact: true }).click()
        const historyResult = detailsPanel.getByRole("region", {
            name: "Submission result",
        })
        for (const result of [consoleResult, historyResult]) {
            await expect(
                result.getByText(scenario.status, { exact: true })
            ).toBeVisible()
            if (scenario.status === "Compile Error") {
                await expect(
                    result.getByText("Compiler diagnostic", { exact: true })
                ).toBeVisible()
            } else {
                await expect(
                    result.getByText("First test", { exact: true })
                ).toBeVisible()
                await expect(
                    result.getByText("Second test", { exact: true })
                ).toBeVisible()
            }
        }
        if (scenario.status !== "Compile Error") {
            const passed = scenario.status === "Accepted" ? 2 : 1
            await expect(
                consoleResult.getByText(
                    `Worker Test Matrix (${passed}/2 passed)`
                )
            ).toBeVisible()
            await expect(
                historyResult.getByText(
                    `Worker Test Results (${passed}/2 passed)`
                )
            ).toBeVisible()
            await expect(
                historyResult.getByText("PASSED", { exact: true })
            ).toHaveCount(passed)
            await expect(
                historyResult.getByText("FAILED", { exact: true })
            ).toHaveCount(2 - passed)
        }
        await expect(historyResult.locator("pre")).toHaveText(uploads[0])
        await historyResult
            .getByRole("button", { name: "Back to list" })
            .click()
        await expect(historyResult).toHaveCount(0)
        await expect(
            consoleResult.getByText(scenario.status, { exact: true })
        ).toBeVisible()
        await page
            .getByRole("navigation", { name: "Main navigation" })
            .getByRole("button", { name: "Submissions", exact: true })
            .click()
        const rows = page.getByRole("table").locator("tbody tr")
        await expect(rows).toHaveCount(1)
        await expect(rows.first()).toContainText(scenario.status)
        expect(uploads).toHaveLength(1)
    })
}
