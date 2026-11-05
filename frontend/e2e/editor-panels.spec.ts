import { test, expect } from "@playwright/test"

test("test cases and custom input survive console tabs and collapse", async ({
    page,
}) => {
    await page.goto("/")
    const workspace = page.getByRole("region", { name: "Coding workspace" })
    const body = workspace.locator(".console-body")
    const submissionTab = workspace.getByRole("button", {
        name: "Submission",
        exact: true,
    })
    const testCasesTab = workspace.getByRole("button", {
        name: "Test cases",
        exact: true,
    })

    await body.getByRole("button", { name: "Case 2", exact: true }).click()
    await expect(
        body.getByText("num1 = -10, num2 = 4", { exact: true })
    ).toBeVisible()
    await submissionTab.click()
    await expect(
        body.getByText(
            "Submit your solution to check it against the test cases."
        )
    ).toBeVisible()
    await testCasesTab.click()
    await expect(
        body.getByText("num1 = -10, num2 = 4", { exact: true })
    ).toBeVisible()

    await body.getByRole("button", { name: "+ Custom", exact: true }).click()
    const input = body.getByRole("textbox", { name: "Custom Input:" })
    await input.fill("num1 = 5, num2 = 8")
    await submissionTab.click()
    await testCasesTab.click()
    await expect(input).toHaveValue("num1 = 5, num2 = 8")
    await workspace.getByTitle("Collapse console", { exact: true }).click()
    await expect(body).toHaveCSS("height", "0px")
    await workspace.getByTitle("Expand console", { exact: true }).click()
    await expect(body).toHaveCSS("height", "180px")
    await expect(input).toHaveValue("num1 = 5, num2 = 8")
})

test("editor settings, copy, fullscreen, and console resizing remain available", async ({
    page,
}) => {
    // Keep clipboard assertions deterministic without requiring desktop permissions.
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: async (text: string) => {
                    localStorage.setItem("copied-code", text)
                },
            },
        })
    })
    await page.goto("/")
    const workspace = page.getByRole("region", { name: "Coding workspace" })
    const editor = workspace.getByRole("region", {
        name: "Code editor",
        exact: true,
    })
    const pane = editor.locator("..")
    const body = workspace.locator(".console-body")
    const separator = workspace.getByRole("separator", {
        name: "Resize editor and console panes",
    })

    await workspace
        .getByRole("combobox", { name: "Programming language" })
        .click()
    await page
        .getByRole("option", { name: "C (GCC 13.2)", exact: true })
        .click()
    const fontSize = workspace.getByRole("combobox", {
        name: "Editor font size",
    })
    await fontSize.click()
    await page.getByRole("option", { name: "16px", exact: true }).click()
    await expect(fontSize).toHaveText("16px")
    await workspace.getByTitle("Copy code", { exact: true }).click()
    await expect(
        workspace.getByTitle("Copy code", { exact: true })
    ).toContainText("Copied")
    await expect
        .poll(() => page.evaluate(() => localStorage.getItem("copied-code")))
        .toContain("int add(int a, int b)")
    await workspace.getByTitle("Reset code template", { exact: true }).click()

    await separator.focus()
    await separator.press("ArrowUp")
    await expect(body).toHaveCSS("height", "200px")
    await separator.press("ArrowDown")
    await expect(body).toHaveCSS("height", "180px")
    await separator.scrollIntoViewIfNeeded()
    const handle = await separator.boundingBox()
    expect(handle).not.toBeNull()
    await page.mouse.move(
        handle!.x + handle!.width / 2,
        handle!.y + handle!.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
        handle!.x + handle!.width / 2,
        handle!.y + handle!.height / 2 - 24,
        { steps: 4 }
    )
    await page.mouse.up()
    await expect(body).toHaveCSS("height", "204px")
    await expect(separator).toHaveAttribute("aria-valuenow", "204")
    await expect(editor).toBeVisible()

    const initialHeight = (await pane.boundingBox())!.height
    await workspace.getByTitle("Fullscreen", { exact: true }).click()
    await expect(pane).toHaveCSS("position", "fixed")
    await expect
        .poll(async () => (await pane.boundingBox())?.height ?? 0)
        .toBeGreaterThan(initialHeight)
    const submit = workspace.getByRole("button", {
        name: "Submit",
        exact: true,
    })
    await submit.click({ button: "right" })
    await page
        .getByRole("menuitem", { name: "Collapse Console", exact: true })
        .click()
    await expect(body).toHaveCSS("height", "0px")
    await submit.click({ button: "right" })
    await page
        .getByRole("menuitem", { name: "Open Console", exact: true })
        .click()
    await expect(body).toHaveCSS("height", "204px")
    await submit.click({ button: "right" })
    await page
        .getByRole("menuitem", { name: "Copy Editor Code", exact: true })
        .click()
    await submit.click({ button: "right" })
    await page
        .getByRole("menuitem", { name: "Reset to Starter Code", exact: true })
        .click()
    await submit.click({ button: "right" })
    await page
        .getByRole("menuitem", { name: "Exit Fullscreen", exact: true })
        .click()
    await expect(pane).toHaveCSS("position", "relative")
    await expect(fontSize).toHaveText("16px")
})
