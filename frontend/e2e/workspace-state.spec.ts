import { test, expect } from "@playwright/test"

test("history and console share selection while Back to list changes only presentation", async ({
    page,
}) => {
    const attempts = new Map<string, number>()
    let finishSecond!: () => void
    const secondGrading = new Promise<void>((resolve) => {
        finishSecond = resolve
    })
    await page.route("**/upload?job=*", async (route) => {
        const id = new URL(route.request().url()).searchParams.get("job")!
        attempts.set(id, attempts.size + 1)
        await route.fulfill({ status: 200, body: "OK" })
    })
    await page.route("**/fetch?job=*", async (route) => {
        const id = new URL(route.request().url()).searchParams.get("job")!
        const attempt = attempts.get(id)
        if (attempt === 2) await secondGrading
        await route.fulfill({
            json: {
                status: "completed",
                results: {
                    tests: [
                        { name: `Attempt ${attempt}`, passed: true, error: "" },
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
    const consoleResult = workspace
        .locator(".console-body")
        .getByRole("region", { name: "Submission result" })
    const detailsPanel = workspace.getByRole("tabpanel")
    const historyResult = detailsPanel.getByRole("region", {
        name: "Submission result",
    })

    try {
        await submit.click()
        await expect(
            consoleResult.getByText("Attempt 1", { exact: true })
        ).toBeVisible()
        await workspace.getByRole("tab", { name: /^Submissions/ }).click()
        await detailsPanel.getByText("Accepted", { exact: true }).click()
        await expect(
            historyResult.getByText("Attempt 1", { exact: true })
        ).toBeVisible()

        // Starting another submission must not leave an old detail object behind.
        await submit.click()
        await expect.poll(() => attempts.size).toBe(2)
        await expect(historyResult).toHaveCount(0)
    } finally {
        finishSecond()
    }
    for (const result of [consoleResult, historyResult]) {
        await expect(
            result.getByText("Attempt 2", { exact: true })
        ).toBeVisible()
        await expect(
            result.getByText("Attempt 1", { exact: true })
        ).toHaveCount(0)
    }

    await historyResult.getByRole("button", { name: "Back to list" }).click()
    await expect(historyResult).toHaveCount(0)
    await expect(
        consoleResult.getByText("Attempt 2", { exact: true })
    ).toBeVisible()
    await expect(
        detailsPanel.getByText("Accepted", { exact: true })
    ).toHaveCount(2)

    // Selecting an older entry changes the authoritative selection in both panes.
    await detailsPanel.getByText("Accepted", { exact: true }).last().click()
    for (const result of [consoleResult, historyResult])
        await expect(
            result.getByText("Attempt 1", { exact: true })
        ).toBeVisible()

    await workspace
        .getByRole("tab", { name: "Description", exact: true })
        .click()
    await workspace.getByRole("tab", { name: /^Submissions/ }).click()
    await expect(historyResult).toHaveCount(0)
    await expect(
        consoleResult.getByText("Attempt 1", { exact: true })
    ).toBeVisible()
    expect(attempts.size).toBe(2)
})

test("a result completing after assignment navigation stays in history without leaking selection", async ({
    page,
}) => {
    let uploads = 0
    let finishGrading!: () => void
    const grading = new Promise<void>((resolve) => {
        finishGrading = resolve
    })
    await page.route("**/upload?job=*", async (route) => {
        uploads++
        await route.fulfill({ status: 200, body: "OK" })
    })
    await page.route("**/fetch?job=*", async (route) => {
        await grading
        await route.fulfill({
            json: {
                status: "completed",
                results: {
                    tests: [{ name: "Late result", passed: true, error: "" }],
                },
            },
        })
    })

    await page.goto("/")
    const navigation = page.getByRole("navigation", { name: "Main navigation" })
    try {
        await page.getByRole("button", { name: "Submit", exact: true }).click()
        await expect.poll(() => uploads).toBe(1)
        await navigation
            .getByRole("button", { name: "Assignments", exact: true })
            .click()
        await page
            .getByRole("button", { name: "Pointers: the basics", exact: true })
            .click()
        await expect(
            page.getByRole("heading", {
                name: "Pointers: the basics",
                exact: true,
            })
        ).toBeVisible()
        await page
            .getByRole("button", { name: "Open memory lab", exact: true })
            .first()
            .click()
        await expect(
            page.getByRole("heading", {
                name: "Pointers: memory lab",
                exact: true,
            })
        ).toBeVisible()
    } finally {
        finishGrading()
    }

    await navigation
        .getByRole("button", { name: "Submissions", exact: true })
        .click()
    const row = page.getByRole("table").locator("tbody tr")
    await expect(row).toHaveCount(1)
    await expect(row).toContainText("Accepted")
    await navigation
        .getByRole("button", { name: "Workspace", exact: true })
        .click()
    await expect(
        page.getByRole("heading", { name: "Pointers: memory lab", exact: true })
    ).toBeVisible()

    await navigation
        .getByRole("button", { name: "Submissions", exact: true })
        .click()
    await row.getByRole("button", { name: "Open", exact: true }).click()
    const workspace = page.getByRole("region", { name: "Coding workspace" })
    await expect(
        workspace.getByRole("heading", {
            name: "Add Two Integers",
            exact: true,
        })
    ).toBeVisible()
    const consoleBody = workspace.locator(".console-body")
    await expect(
        consoleBody.getByRole("region", { name: "Submission result" })
    ).toHaveCount(0)
    await expect(
        consoleBody.getByText(
            "Submit your solution to check it against the test cases."
        )
    ).toBeVisible()

    await workspace.getByRole("tab", { name: /^Submissions/ }).click()
    await workspace
        .getByRole("tabpanel")
        .getByText("Accepted", { exact: true })
        .click()
    await expect(
        consoleBody.getByText("Late result", { exact: true })
    ).toBeVisible()
    expect(uploads).toBe(1)
})
