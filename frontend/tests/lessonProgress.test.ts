import test from "node:test"
import assert from "node:assert/strict"
import {
    initialLessonProgress,
    lessonProgressReducer,
    restoreLessonProgress,
} from "../src/lib/lessonProgress.ts"

const sections = [
    { id: "setup", stepCount: 1 },
    { id: "trace", stepCount: 2 },
]

test("lecture progress uses the supplied sections and step counts", () => {
    const start = initialLessonProgress()
    const complete = { type: "complete-lesson" } as const
    const setup = lessonProgressReducer(
        start,
        { type: "lesson-step", chapter: -1, step: 5 },
        sections
    )
    assert.deepEqual(setup, { ...start, viewed: ["setup"] })
    const trace = lessonProgressReducer(
        setup,
        { type: "lesson-step", chapter: 1, step: 0 },
        sections
    )
    assert.deepEqual(trace.viewed, ["setup"])
    assert.equal(lessonProgressReducer(trace, complete, sections), trace)
    const end = lessonProgressReducer(
        trace,
        { type: "lesson-step", chapter: 9, step: 8 },
        sections
    )
    assert.deepEqual(lessonProgressReducer(end, complete, sections), {
        chapter: 1,
        step: 1,
        viewed: ["setup", "trace"],
        completed: true,
    })
})

test("restore validates saved progress against the supplied lesson", () => {
    const saved = {
        chapter: 8,
        step: 10,
        viewed: ["trace", "old-section", "trace"],
        completed: true,
    }
    assert.deepEqual(restoreLessonProgress(saved, sections), {
        chapter: 1,
        step: 1,
        viewed: ["trace"],
        completed: false,
    })
    const complete = {
        chapter: 1,
        step: 1,
        viewed: ["setup", "trace"],
        completed: true,
    }
    assert.deepEqual(restoreLessonProgress(complete, sections), complete)
    assert.deepEqual(
        restoreLessonProgress(null, sections),
        initialLessonProgress()
    )
})
