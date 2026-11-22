import { expect, test } from "@playwright/test"

test("calls a Python function, checks return values, and can stop a loop", async ({
    page,
}) => {
    test.skip(!process.env.GRADCAMP_LIVE_PYTHON, "Requires the Pyodide CDN")
    test.setTimeout(120_000)
    await page.addInitScript(() => {
        localStorage.setItem(
            "gradcamp.demo.custom-exercises.v1",
            JSON.stringify([
                {
                    id: "scale",
                    title: "Scale a list",
                    prompt: "Return a new list multiplied by the factor.",
                    functionName: "scale",
                    signature: { arguments: ["list", "int"], returns: "list" },
                    starterCode:
                        'def scale(values, factor):\n    assert type(factor) is int\n    print("debug")\n    return [value * factor for value in values]',
                    cases: [
                        { input: "[[2, 3], 2.0]", expectedOutput: "[4, 6]" },
                        { input: "[[1], 1]", expectedOutput: "[true]" },
                    ],
                },
            ])
        )
    })
    let apiRequests = 0
    await page.route(/\/(upload|fetch)(\?|$)/, async (route) => {
        apiRequests++
        await route.abort()
    })
    await page.goto("/assignments")
    await page.getByRole("button", { name: "Custom", exact: true }).click()
    await page.getByRole("button", { name: "Scale a list" }).click()

    const exercise = page.getByRole("region", { name: "Coding workspace" })
    const consoleBody = exercise.locator(".console-body")
    const status = consoleBody.getByRole("status")
    const result = consoleBody.getByRole("region", {
        name: "Submission result",
    })
    const lines = exercise
        .getByRole("region", { name: "Code editor" })
        .locator(".view-lines")
    const run = exercise.getByRole("button", { name: "Submit", exact: true })
    const wait = { timeout: 50_000 }
    async function replaceCode(source: string) {
        await expect(lines).toBeVisible()
        // Set the model directly so simulated typing cannot auto-indent the fixture.
        await page.evaluate((text) => {
            const { monaco } = window as Window & {
                monaco: {
                    editor: {
                        getModels: () => {
                            setValue: (source: string) => void
                        }[]
                    }
                }
            }
            monaco.editor.getModels()[0].setValue(text)
        }, source)
    }
    await run.click()
    await expect(
        result.getByText("Local Test Matrix (1/2 passed)")
    ).toBeVisible(wait)
    await expect(
        result.getByText("Wrong Answer", { exact: true })
    ).toBeVisible()
    await expect(result.getByText(/Actual return: \[1\]/)).toBeVisible()
    await expect(result.getByText(/Printed output: debug/)).toBeVisible()

    await exercise.getByRole("tab", { name: /^Submissions/ }).click()
    const history = exercise.getByRole("tabpanel")
    await history.getByText("Wrong Answer", { exact: true }).click()
    await expect(
        history.getByText("Local Test Results (1/2 passed)")
    ).toBeVisible()
    await exercise.getByRole("tab", { name: "Description" }).click()

    await exercise.getByRole("button", { name: "Edit exercise" }).click()
    const edit = page.getByRole("form", { name: "Edit Python exercise" })
    await edit
        .getByRole("group", { name: "Case 2", exact: true })
        .getByRole("textbox", { name: "Expected return (JSON)" })
        .fill("[1]")
    await edit.getByRole("button", { name: "Save exercise" }).click()
    await replaceCode(
        "def multiply(value, factor):\n    return value * factor\n\ndef scale(values, factor):\n    return [multiply(value, factor) for value in values]"
    )
    await run.click()
    await expect(result.getByText("Accepted", { exact: true })).toBeVisible(
        wait
    )
    await expect(
        result.getByText("Local Test Matrix (2/2 passed)")
    ).toBeVisible()

    await replaceCode(
        "def scale(values, factor):\n    print([value * factor for value in values])"
    )
    await run.click()
    await expect(
        result.getByText("Local Test Matrix (0/2 passed)")
    ).toBeVisible(wait)
    await expect(
        result.getByText(/Expected return type list, got NoneType/).first()
    ).toBeVisible()

    await replaceCode(
        "def scale(values, factor):\n    return tuple(value * factor for value in values)"
    )
    await run.click()
    await expect(
        result.getByText(/Expected return type list, got tuple/).first()
    ).toBeVisible(wait)
    await expect(
        result.getByText("Wrong Answer", { exact: true })
    ).toBeVisible()

    await replaceCode(
        "def scale(values, factor):\n    raise ValueError('example error')"
    )
    await run.click()
    await expect(
        result.getByText("Runtime Error", { exact: true })
    ).toBeVisible(wait)
    await expect(
        result.getByText(/ValueError: example error/).first()
    ).toBeVisible()

    await replaceCode(
        "def scale(values, factor):\n    while True:\n        pass"
    )
    await run.click()
    await expect(status).toHaveText("Running test cases…", wait)
    await exercise.getByRole("button", { name: "Stop run" }).click()
    await expect(status).toHaveText("Run stopped.")

    await run.click()
    await expect(
        result.getByText("Time Limit Exceeded", { exact: true })
    ).toBeVisible(wait)
    await expect(
        result.getByText("Run exceeded the 8-second time limit.")
    ).toBeVisible()
    await expect(run).toBeEnabled()
    expect(apiRequests).toBe(0)
})
