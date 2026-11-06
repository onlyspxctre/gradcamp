import test from "node:test"
import assert from "node:assert/strict"
import { DEMO_PROBLEM } from "../src/data/mockProblems.ts"
import { POINTERS_LECTURE, POINTERS_QUIZ } from "../src/data/assignments.ts"
import type { Problem, Submission } from "../src/types/index.ts"
import {
    getActiveCode,
    getActiveSubmission,
    initialWorkspaceState,
    workspaceReducer,
} from "../src/lib/workspaceState.ts"

const OTHER_PROBLEM: Problem = {
    ...DEMO_PROBLEM,
    id: "other-problem",
    title: "Another code assignment",
    starterCode: "int other(void) { return 0; }",
}

function submission(id: string, problem = DEMO_PROBLEM): Submission {
    return {
        id,
        problemId: problem.id,
        problemTitle: problem.title,
        language: "C",
        code: problem.starterCode,
        status: "Accepted",
        timestamp: "12:00:00",
        testsPassed: 1,
        totalTests: 1,
    }
}

test("the active assignment determines the available code", () => {
    let state = initialWorkspaceState(DEMO_PROBLEM)
    assert.equal(state.activeAssignment, DEMO_PROBLEM)
    assert.equal(getActiveCode(state), DEMO_PROBLEM.starterCode)
    assert.equal(getActiveSubmission(state), null)

    state = workspaceReducer(state, {
        type: "edit-code",
        code: "int add(int a, int b) { return a + b; }",
    })
    const draft = getActiveCode(state)
    for (const assignment of [POINTERS_LECTURE, POINTERS_QUIZ]) {
        state = workspaceReducer(state, {
            type: "select-assignment",
            assignment,
        })
        assert.equal(state.activeAssignment, assignment)
        assert.equal(getActiveCode(state), "")
        assert.equal(workspaceReducer(state, { type: "reset-code" }), state)
        assert.equal(
            workspaceReducer(state, { type: "edit-code", code: "ignored" }),
            state
        )
    }
    state = workspaceReducer(state, {
        type: "select-assignment",
        assignment: DEMO_PROBLEM,
    })
    assert.equal(getActiveCode(state), draft)
})

test("drafts, including empty code, are isolated by problem and reset independently", () => {
    let state = initialWorkspaceState(DEMO_PROBLEM)
    state = workspaceReducer(state, { type: "edit-code", code: "draft one" })
    state = workspaceReducer(state, {
        type: "select-assignment",
        assignment: OTHER_PROBLEM,
    })
    assert.equal(getActiveCode(state), OTHER_PROBLEM.starterCode)
    state = workspaceReducer(state, { type: "edit-code", code: "" })
    assert.equal(getActiveCode(state), "")
    state = workspaceReducer(state, {
        type: "select-assignment",
        assignment: DEMO_PROBLEM,
    })
    assert.equal(getActiveCode(state), "draft one")
    state = workspaceReducer(state, { type: "reset-code" })
    assert.equal(getActiveCode(state), DEMO_PROBLEM.starterCode)
    state = workspaceReducer(state, {
        type: "select-assignment",
        assignment: OTHER_PROBLEM,
    })
    assert.equal(getActiveCode(state), "")
})

test("submission selection resolves to the single history object", () => {
    const first = submission("first")
    const second = submission("second")
    let state = initialWorkspaceState(DEMO_PROBLEM)
    for (const result of [first, second])
        state = workspaceReducer(state, {
            type: "submission-completed",
            submission: result,
        })
    assert.equal(getActiveSubmission(state), second)
    state = workspaceReducer(state, { type: "select-submission", id: first.id })
    assert.equal(state.activeSubmissionId, first.id)
    assert.equal(getActiveSubmission(state), first)
    assert.equal(getActiveSubmission(state), state.submissions[1])
    assert.equal(
        workspaceReducer(state, { type: "select-submission", id: "missing" }),
        state
    )
})

test("changing assignments clears selection without removing history", () => {
    const result = submission("first")
    let state = workspaceReducer(initialWorkspaceState(DEMO_PROBLEM), {
        type: "submission-completed",
        submission: result,
    })
    state = workspaceReducer(state, {
        type: "select-assignment",
        assignment: DEMO_PROBLEM,
    })
    assert.equal(getActiveSubmission(state), result)
    state = workspaceReducer(state, {
        type: "select-assignment",
        assignment: POINTERS_LECTURE,
    })
    assert.equal(state.activeSubmissionId, null)
    assert.equal(getActiveSubmission(state), null)
    assert.deepEqual(state.submissions, [result])
    state = workspaceReducer(state, {
        type: "select-assignment",
        assignment: OTHER_PROBLEM,
    })
    assert.equal(
        workspaceReducer(state, { type: "select-submission", id: result.id }),
        state
    )
})

test("a new submission clears the shared selection and completion selects its result", () => {
    const first = submission("first")
    const second = submission("second")
    let state = workspaceReducer(initialWorkspaceState(DEMO_PROBLEM), {
        type: "submission-completed",
        submission: first,
    })
    state = workspaceReducer(state, { type: "submission-started" })
    assert.equal(getActiveSubmission(state), null)
    assert.deepEqual(state.submissions, [first])
    state = workspaceReducer(state, {
        type: "submission-completed",
        submission: second,
    })
    assert.equal(getActiveSubmission(state), second)
    assert.deepEqual(state.submissions, [second, first])
})

test("late results enter history without selecting a result in a learning assignment", () => {
    let state = initialWorkspaceState(DEMO_PROBLEM)
    state = workspaceReducer(state, { type: "submission-started" })
    state = workspaceReducer(state, {
        type: "select-assignment",
        assignment: POINTERS_QUIZ,
    })
    const result = submission("late")
    state = workspaceReducer(state, {
        type: "submission-completed",
        submission: result,
    })
    assert.equal(state.activeAssignment, POINTERS_QUIZ)
    assert.equal(state.activeSubmissionId, null)
    assert.deepEqual(state.submissions, [result])
})

test("late results do not replace another problem's selected submission", () => {
    const otherResult = submission("other", OTHER_PROBLEM)
    let state = workspaceReducer(initialWorkspaceState(OTHER_PROBLEM), {
        type: "submission-completed",
        submission: otherResult,
    })
    state = workspaceReducer(state, {
        type: "submission-completed",
        submission: submission("late"),
    })
    assert.equal(state.activeAssignment, OTHER_PROBLEM)
    assert.equal(getActiveSubmission(state), otherResult)
    assert.equal(state.submissions.length, 2)
})
