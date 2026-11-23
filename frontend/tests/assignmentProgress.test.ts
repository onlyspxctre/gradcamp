import test from "node:test"
import assert from "node:assert/strict"
import {
    readProgress,
    restoreAssignmentProgress,
    serializeAssignmentProgress,
    updateProgress,
} from "../src/lib/assignmentProgress.ts"
import { defineLessonProgress } from "../src/lib/lessonProgress.ts"
import {
    pointerLectureProgress,
    pointerQuizProgress,
} from "../src/data/pointerProgressDefinitions.ts"

const standalone = defineLessonProgress("standalone", [
    { id: "intro", stepCount: 1 },
])
const codecs = [pointerLectureProgress, pointerQuizProgress, standalone]

test("migrates v1 lecture and quiz saves only to their registered assignments", () => {
    const v1 = JSON.stringify({
        version: 1,
        lecture: {
            chapter: 0,
            step: 2,
            viewed: ["addresses"],
            completed: false,
        },
        quiz: { question: 1, answers: {} },
    })
    const state = restoreAssignmentProgress(null, v1, codecs)
    assert.equal(readProgress(state, pointerLectureProgress).step, 2)
    assert.deepEqual(readProgress(state, pointerLectureProgress).viewed, [
        "addresses",
    ])
    assert.equal(readProgress(state, pointerQuizProgress).question, 1)
    assert.equal(state.has(standalone.id), false)
    assert.deepEqual(
        restoreAssignmentProgress(
            serializeAssignmentProgress(state),
            null,
            codecs
        ),
        state
    )
    assert.equal(
        restoreAssignmentProgress('{"version":2,"byAssignment":{}}', v1, codecs)
            .size,
        0
    )
    assert.equal(
        restoreAssignmentProgress("broken", '{"version":0}', codecs).size,
        0
    )
})

test("navigation, completion, and quiz resets affect only the targeted assignment", () => {
    let state = restoreAssignmentProgress(null, null, codecs)
    state = updateProgress(state, pointerLectureProgress, {
        type: "lesson-step",
        chapter: 1,
        step: 1,
    })
    state = updateProgress(state, pointerQuizProgress, {
        type: "quiz-question",
        index: 2,
    })
    state = updateProgress(state, standalone, {
        type: "lesson-step",
        chapter: 0,
        step: 0,
    })
    state = updateProgress(state, standalone, { type: "complete-lesson" })
    const reset = updateProgress(state, pointerQuizProgress, {
        type: "reset-quiz",
    })
    assert.equal(readProgress(reset, pointerQuizProgress).question, 0)
    assert.equal(readProgress(reset, pointerLectureProgress).chapter, 1)
    assert.equal(
        pointerLectureProgress.status(
            readProgress(reset, pointerLectureProgress)
        ),
        "attempted"
    )
    assert.equal(standalone.status(readProgress(reset, standalone)), "solved")
})
