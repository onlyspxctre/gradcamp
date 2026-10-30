import { test, expect, type Locator, type Page } from "@playwright/test"
import {
    POINTER_CHAPTERS,
    POINTER_QUESTIONS,
    type PointerQuestion,
} from "../src/data/pointers"

type Box = { x: number; y: number; width: number; height: number }
async function box(locator: Locator): Promise<Box> {
    const result = await locator.boundingBox()
    expect(result).not.toBeNull()
    return result!
}
async function expectSameBox(locator: Locator, original: Box) {
    for (const key of ["x", "y", "width", "height"] as const) {
        await expect
            .poll(
                async () => Math.abs((await box(locator))[key] - original[key]),
                { message: `Control ${key} must not change` }
            )
            .toBeLessThan(0.75)
    }
}
async function clickAt(page: Page, location: Box) {
    // Unlike locator.click(), this cannot auto-scroll and disguise a moving control.
    await page.mouse.click(
        location.x + location.width / 2,
        location.y + location.height / 2
    )
}
async function openAssignment(page: Page, name: string) {
    await page.goto("/")
    await page.getByRole("button", { name: "Assignments", exact: true }).click()
    await page.getByRole("button", { name, exact: true }).click()
    await page.getByRole("heading", { level: 1, name, exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
}
async function expectNoOverflow(page: Page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth
        )
    ).toBe(false)
}

test("lecture controls stay under the mouse through every step and section", async ({
    page,
}) => {
    await openAssignment(page, "Pointers: the basics")
    const action = page.getByRole("button", {
        name: /^(Next step|Next section|Mark lecture complete)$/,
    })
    await action.scrollIntoViewIfNeeded()
    const original = await box(action)
    const sequence = POINTER_CHAPTERS.flatMap((chapter, chapterIndex) =>
        chapter.frames.map((_, step) => ({ chapter: chapterIndex, step }))
    )
    for (let index = 0; index < sequence.length; index++) {
        await expectSameBox(action, original)
        if (index === sequence.length - 1) break
        await clickAt(page, original)
        await expect
            .poll(() =>
                page.evaluate(() => {
                    const { lecture } = JSON.parse(
                        localStorage.getItem("gradcamp.learning.v1")!
                    )
                    return { chapter: lecture.chapter, step: lecture.step }
                })
            )
            .toEqual(sequence[index + 1])
    }
    await expect(action).toBeEnabled()
    await clickAt(page, original)
    await expect(
        page.getByRole("status").filter({ hasText: "Lecture completed" })
    ).toBeVisible()
    await expectSameBox(
        page
            .getByRole("button", { name: "Open memory lab", exact: true })
            .last(),
        original
    )
    await page
        .getByRole("navigation", { name: "Lesson sections" })
        .getByRole("button", { name: /Read through a pointer/ })
        .click()
    await expect(
        page.getByRole("heading", {
            name: "Read through a pointer",
            exact: true,
        })
    ).toBeFocused()
    await expectNoOverflow(page)
})

async function fillAnswer(
    page: Page,
    question: PointerQuestion,
    correct: boolean,
    wrongValueOnly = false
) {
    if (question.kind === "choice") {
        const choice = correct
            ? question.choices.find((item) => item.id === question.answer)!
            : question.choices.find((item) => item.id !== question.answer)!
        await page
            .getByRole("radio", { name: choice.label, exact: true })
            .check()
    } else {
        if (question.kind === "memory") {
            const target =
                correct || wrongValueOnly
                    ? question.targetIndex
                    : (question.targetIndex + 1) % question.cells.length
            const slider = page.getByRole("slider", {
                name: "Pointer address",
                exact: true,
            })
            await slider.press("Home")
            for (let index = 0; index < target; index++)
                await slider.press("ArrowRight")
        }
        await page
            .getByRole("textbox", { name: question.valueLabel, exact: true })
            .fill(
                String(
                    correct || (question.kind === "memory" && !wrongValueOnly)
                        ? question.answer
                        : question.answer + 1
                )
            )
    }
}

test("quiz controls stay fixed through feedback, retries, and all six question layouts", async ({
    page,
}) => {
    await openAssignment(page, "Pointers: memory lab")
    const next = page.getByRole("button", {
        name: /^(Skip for now|Next question|Review unanswered|View results)$/,
    })
    const submit = page.getByRole("button", {
        name: /^(Submit answer|Submit again|Submitted)$/,
    })

    async function submitAndCheck(correct: boolean) {
        // Answer fields can intentionally scroll into view. Anchor the controls once
        // before submitting, then require submission and Next to leave them there.
        await next.scrollIntoViewIfNeeded()
        const nextPosition = await box(next)
        const submitPosition = await box(submit)
        await clickAt(page, submitPosition)
        await expect(
            page
                .getByRole("status")
                .filter({ hasText: correct ? /^Correct/ : /^Not quite/ })
        ).toBeVisible()
        await expectSameBox(next, nextPosition)
        await expectSameBox(submit, submitPosition)
        // Include the end of value/pointer animations, not just the first render.
        await page.waitForTimeout(220)
        await expectSameBox(next, nextPosition)
        return nextPosition
    }

    for (const [index, question] of POINTER_QUESTIONS.entries()) {
        await expect(
            page.getByRole("heading", { name: question.title, exact: true })
        ).toBeVisible()
        await fillAnswer(page, question, false)
        await submitAndCheck(false)
        if (index === 0) {
            await fillAnswer(page, question, false, true)
            await submitAndCheck(false)
        }
        await fillAnswer(page, question, true)
        const nextPosition = await submitAndCheck(true)
        const submitPosition = await box(submit)
        if (index < POINTER_QUESTIONS.length - 1) {
            await clickAt(page, nextPosition)
            await expect(
                page.getByRole("heading", {
                    name: POINTER_QUESTIONS[index + 1].title,
                    exact: true,
                })
            ).toBeFocused()
            await expectSameBox(next, nextPosition)
            await expectSameBox(submit, submitPosition)
        } else {
            await expect(next).toHaveText("View results")
            await clickAt(page, nextPosition)
            await expect(
                page.getByRole("heading", { name: "Results", exact: true })
            ).toBeVisible()
        }
    }
    await page
        .getByRole("button", { name: "Follow the address", exact: true })
        .click()
    await expect(
        page.getByRole("heading", { name: "Follow the address", exact: true })
    ).toBeFocused()
    await expectNoOverflow(page)
})
