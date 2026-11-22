import { expect, test } from "@playwright/test"

test("creates and edits a local Python exercise without using the grader", async ({
    page,
}) => {
    const title = "Double an integer"
    const starter = "def double(n):\n    # Return twice n.\n    pass"
    let gradingRequests = 0
    await page.route(/\/(upload|fetch)\?/, async (route) => {
        gradingRequests++
        await route.abort()
    })

    await page.goto("/assignments")
    const filters = page.getByRole("group", {
        name: "Filter by assignment type",
    })
    const custom = filters.getByRole("button", { name: "Custom", exact: true })
    const all = filters.getByRole("button", { name: "All types", exact: true })
    const exercise = page.getByRole("button", { name: title, exact: true })

    await expect(custom).toHaveAttribute("aria-pressed", "false")
    await expect(
        page.getByRole("link", { name: "Add Two Integers", exact: true })
    ).toBeVisible()
    await custom.click()
    await expect(page.getByText("No custom exercises yet.")).toBeVisible()
    await expect(
        page.getByRole("link", { name: "Add Two Integers", exact: true })
    ).toBeHidden()
    const search = page.getByRole("searchbox", { name: "Search assignments" })
    await search.fill("unrelated")
    await page.getByRole("button", { name: "Create custom exercise" }).click()

    const form = page.getByRole("form", { name: "New Python exercise" })
    await form.getByRole("textbox", { name: "Exercise title" }).fill(title)
    await form
        .getByRole("textbox", { name: "Problem statement" })
        .fill("Return twice the given integer.")
    await form.getByRole("textbox", { name: /Function name/ }).fill("double")
    await form
        .getByRole("textbox", { name: "Starter code (Python)" })
        .fill(starter)
    const firstCase = form.getByRole("group", { name: "Case 1", exact: true })
    const firstArgs = firstCase.getByRole("textbox", {
        name: "Arguments (JSON array)",
    })
    await firstArgs.fill("7")
    await firstCase
        .getByRole("textbox", { name: "Expected return (JSON)" })
        .fill("14")
    await form.getByRole("button", { name: "Save exercise" }).click()
    await expect(form.getByRole("alert")).toContainText(
        "Case 1: Arguments must be a JSON array"
    )
    await firstArgs.fill("[7]")
    const save = form.getByRole("button", { name: "Save exercise" })
    await save.click()
    await expect(form.getByRole("alert")).toContainText(
        "Expected 2 argument(s), got 1"
    )
    await form.getByRole("button", { name: "Remove argument 2" }).click()
    await firstArgs.fill('["7"]')
    await save.click()
    await expect(form.getByRole("alert")).toContainText(
        "Argument 1 must be Integer"
    )
    await firstArgs.fill("[7]")
    const addCase = form.getByRole("button", { name: "Add test case" })
    await addCase.click()
    const secondCase = form.getByRole("group", { name: "Case 2", exact: true })
    await secondCase
        .getByRole("textbox", { name: "Arguments (JSON array)" })
        .fill("[-3]")
    await secondCase
        .getByRole("textbox", { name: "Expected return (JSON)" })
        .fill("-6")
    await addCase.click()
    await form.getByRole("button", { name: "Remove case 3" }).click()
    await form.getByRole("button", { name: "Save exercise" }).click()
    await expect(search).toHaveValue("")
    await expect(exercise).toBeVisible()

    await all.click()
    await expect(exercise).toBeHidden()
    await page.reload()
    await expect(custom).toHaveAttribute("aria-pressed", "false")
    await expect(exercise).toBeHidden()
    await custom.click()
    await exercise.click()
    const workspace = page.getByRole("region", { name: "Coding workspace" })
    await expect(
        workspace.getByRole("heading", { name: title, exact: true })
    ).toBeVisible()
    await expect(
        workspace.getByRole("tab", { name: "Description" })
    ).toHaveAttribute("aria-selected", "true")
    await expect(
        workspace
            .getByRole("region", { name: "Code editor" })
            .locator(".view-lines")
    ).toContainText("def double(n):")
    await expect(
        workspace.getByRole("combobox", { name: "Programming language" })
    ).toContainText("Python")
    const consoleBody = workspace.locator(".console-body")
    await expect(consoleBody.locator("pre")).toHaveText(["[7]", "14"])
    await consoleBody
        .getByRole("button", { name: "Case 2", exact: true })
        .click()
    await expect(consoleBody.locator("pre")).toHaveText(["[-3]", "-6"])
    await workspace.getByRole("button", { name: "Edit exercise" }).click()
    const edit = page.getByRole("form", { name: "Edit Python exercise" })
    const output = edit
        .getByRole("group", { name: "Case 2", exact: true })
        .getByRole("textbox", { name: "Expected return (JSON)" })
    await expect(
        edit.getByRole("textbox", { name: /Function name/ })
    ).toHaveValue("double")
    await expect(edit.getByLabel("Argument 1 type")).toHaveValue("int")
    await expect(output).toHaveValue("-6")
    await edit.getByLabel("Return type").selectOption("str")
    await edit.getByRole("button", { name: "Save exercise" }).click()
    await expect(edit.getByRole("alert")).toContainText(
        "Expected return must be String"
    )
    await edit
        .getByRole("group", { name: "Case 1", exact: true })
        .getByRole("textbox", { name: "Expected return (JSON)" })
        .fill('"14"')
    await output.fill('"-7"')
    await edit.getByRole("button", { name: "Save exercise" }).click()
    await expect(
        workspace.getByRole("button", { name: "Submit", exact: true })
    ).toBeEnabled()
    await workspace
        .getByRole("button", { name: "Back to custom exercises" })
        .click()
    await expect(exercise).toBeVisible()
    await page.reload()
    await custom.click()
    await expect(exercise).toHaveCount(1)
    await exercise.click()
    await consoleBody
        .getByRole("button", { name: "Case 2", exact: true })
        .click()
    await expect(consoleBody.locator("pre")).toHaveText(["[-3]", '"-7"'])
    await expect(
        workspace.getByText("double(arg1: int) -> str", { exact: true })
    ).toBeVisible()
    expect(gradingRequests).toBe(0)
})

test("deleting a custom exercise requires confirmation and only removes that exercise", async ({
    page,
}) => {
    await page.addInitScript(() => {
        const key = "gradcamp.demo.custom-exercises.v1"
        if (localStorage.getItem(key) !== null) return
        const draft = {
            prompt: "Return 1.",
            functionName: "solve",
            signature: { arguments: [], returns: "int" },
            starterCode: "def solve():\n    return 1",
            cases: [{ input: "[]", expectedOutput: "1" }],
        }
        const exercises = [
            { ...draft, id: "delete-me", title: "Remove me" },
            { ...draft, id: "keep-me", title: "Keep me" },
        ]
        localStorage.setItem(key, JSON.stringify(exercises))
    })
    await page.goto("/assignments")
    const custom = page.getByRole("button", { name: "Custom", exact: true })
    const target = page.getByRole("button", { name: "Remove me", exact: true })
    const remaining = page.getByRole("button", { name: "Keep me", exact: true })
    await custom.click()
    await target.click()
    await page.getByRole("button", { name: "Edit exercise" }).click()
    const remove = page.getByRole("button", { name: "Delete exercise" })
    const form = page.getByRole("form", { name: "Edit Python exercise" })

    page.once("dialog", (dialog) => dialog.dismiss())
    await remove.click()
    await expect(form).toBeVisible()
    await form.getByRole("button", { name: "Cancel" }).click()
    await page.getByRole("button", { name: "Back to custom exercises" }).click()
    await expect(target).toBeVisible()

    await target.click()
    await page.getByRole("button", { name: "Edit exercise" }).click()
    page.once("dialog", (dialog) => dialog.accept())
    await remove.click()
    await expect(remaining).toBeVisible()
    await expect(target).toHaveCount(0)

    await page.reload()
    await expect(
        page.getByRole("link", { name: "Add Two Integers", exact: true })
    ).toBeVisible()
    await custom.click()
    await expect(remaining).toBeVisible()
    await expect(target).toHaveCount(0)
})
