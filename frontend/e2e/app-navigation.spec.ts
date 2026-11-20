import { expect, test } from "@playwright/test"

const swapPath = "/assignments/swap-two-integers"
const quizPath = "/assignments/pointers-memory-lab"

test("Back and Forward restore the page and keep the assignment draft", async ({
    page,
}) => {
    await page.goto("/")
    const nav = page.getByRole("navigation", { name: "Main navigation" })
    const assignments = nav.getByRole("link", { name: "Assignments" })
    const submissions = nav.getByRole("link", { name: "Submissions" })
    const workspace = nav.getByRole("link", { name: "Workspace" })
    const catalogHeading = page.getByRole("heading", {
        name: "Assignments",
        exact: true,
    })
    const swapHeading = page.getByRole("heading", {
        name: "Swap Two Integers",
        exact: true,
    })
    const swap = page.getByRole("link", {
        name: "Swap Two Integers",
        exact: true,
    })

    await assignments.click()
    await expect(page).toHaveURL(/\/assignments$/)
    await expect(swap).toHaveAttribute("href", swapPath)
    await swap.click()
    await expect(page).toHaveURL(new RegExp(`${swapPath}$`))
    await expect(swapHeading).toBeVisible()
    await expect(workspace).toHaveAttribute("aria-current", "page")

    const lines = page
        .getByRole("region", { name: "Code editor" })
        .locator(".view-lines")
    await lines.click()
    await page.keyboard.press("Control+Home")
    await page.keyboard.insertText("/* navigation draft */")
    await expect(lines).toContainText("navigation draft")

    await submissions.click()
    await expect(page).toHaveURL(/\/submissions$/)
    await expect(
        page.getByRole("heading", { name: "Submission history" })
    ).toBeVisible()
    await expect(workspace).toHaveAttribute("href", swapPath)

    await page.goBack()
    await expect(swapHeading).toBeVisible()
    await expect(lines).toContainText("navigation draft")
    await page.goBack()
    await expect(page).toHaveURL(/\/assignments$/)
    await expect(catalogHeading).toBeVisible()
    await page.goBack()
    await expect(
        page.getByRole("heading", { name: "Add Two Integers", exact: true })
    ).toBeVisible()
    await expect(lines).toContainText("int add")
    await expect(lines).not.toContainText("navigation draft")

    await page.goForward()
    await expect(catalogHeading).toBeVisible()
    await page.goForward()
    await expect(page).toHaveURL(new RegExp(`${swapPath}$`))
    await expect(swapHeading).toBeVisible()
    await expect(lines).toContainText("navigation draft")
    await page.goForward()
    await expect(page).toHaveURL(/\/submissions$/)
})

test("direct assignment URLs survive refresh and unknown URLs have a way back", async ({
    page,
}) => {
    await page.goto(swapPath)
    await expect(
        page.getByRole("heading", { name: "Swap Two Integers", exact: true })
    ).toBeVisible()

    await page.goto(`${quizPath}/`)
    const quiz = page.getByRole("heading", {
        name: "Pointers: memory lab",
        exact: true,
    })
    await expect(quiz).toBeVisible()
    await page.reload()
    await expect(quiz).toBeVisible()
    await page.getByRole("button", { name: "Open lecture", exact: true }).click()
    await expect(page).toHaveURL(/\/assignments\/pointers-basics$/)
    await page.goBack()
    await expect(quiz).toBeVisible()

    await page.goto("/assignments/not-a-real-assignment")
    await expect(
        page.getByRole("heading", { name: "Page not found" })
    ).toBeVisible()
    await page.getByRole("link", { name: "Browse assignments" }).click()
    await expect(page).toHaveURL(/\/assignments$/)
})
