import { test, expect } from "@playwright/test"

for (const malformed of [false, true]) {
    test(
        malformed
            ? "malformed grading data is reported as a protocol error in console and history"
            : "evaluator diagnostics are preserved as plain text in console and history",
        async ({ page }) => {
            const diagnostics = [
                "Time Limit Exceeded",
                "Segmentation Fault (SIGSEGV)",
                "Expected '0', got '<script>alert(1)</script>'",
            ]
            const names = [
                "Test One (12 + 5 = 17)",
                "Test Two (-10 + 4 = -6)",
                "Test Three (0 + 0 = 0)",
            ]
            await page.route("**/upload?job=*", async (route) => {
                await route.fulfill({ status: 200, body: "Uploaded" })
            })
            await page.route("**/fetch?job=*", async (route) => {
                await route.fulfill({
                    json: {
                        status: "completed",
                        results: {
                            tests: names.map((name, index) => ({
                                name,
                                passed: malformed ? "false" : false,
                                error: diagnostics[index],
                            })),
                        },
                    },
                })
            })
            await page.goto("/")
            const workspace = page.getByRole("region", {
                name: "Coding workspace",
            })
            await workspace
                .getByRole("button", { name: "Submit", exact: true })
                .click()
            const status = malformed ? "Runtime Error" : "Wrong Answer"
            const consoleResult = workspace
                .locator(".console-body")
                .getByRole("region", {
                    name: "Submission result",
                })
            await expect(
                consoleResult.getByText(status, { exact: true })
            ).toBeVisible()
            await workspace.getByRole("tab", { name: /^Submissions/ }).click()
            const history = workspace.getByRole("tabpanel")
            await history.getByText(status, { exact: true }).click()
            const historyResult = history.getByRole("region", {
                name: "Submission result",
            })
            for (const result of [consoleResult, historyResult]) {
                if (malformed) {
                    await expect(
                        result.getByText(
                            "Invalid grading response from backend (/fetch).",
                            { exact: true }
                        )
                    ).toBeVisible()
                    await expect(
                        result.getByText("Accepted", { exact: true })
                    ).toHaveCount(0)
                    await expect(
                        result.getByText(names[0], { exact: true })
                    ).toHaveCount(0)
                } else {
                    for (const diagnostic of diagnostics)
                        await expect(
                            result.getByText(diagnostic, { exact: true })
                        ).toBeVisible()
                    await expect(result.locator("script")).toHaveCount(0)
                }
            }
        }
    )
}
