import test from "node:test"
import assert from "node:assert/strict"
import {
    POINTER_QUESTIONS,
    formatAddress,
    makeMemory,
    gradePointerAnswer,
    type QuizResponse,
} from "../src/data/pointers.ts"
import {
    initialQuizProgress,
    isQuizComplete,
    pointerQuizReducer,
    quizCorrectCount,
    restoreQuizProgress,
} from "../src/lib/pointerQuizProgress.ts"

function correctResponse(index: number): QuizResponse {
    const question = POINTER_QUESTIONS[index]
    return question.kind === "choice"
        ? { choice: question.answer }
        : {
              cellIndex: question.kind === "memory" ? question.targetIndex : 0,
              value: String(question.answer),
          }
}

test("memory cells are four bytes apart, with distinct addresses and integer values", () => {
    const cells = makeMemory([10, 25, 42, -7])
    assert.deepEqual(
        cells.map((cell) => formatAddress(cell.address)),
        ["0x1000", "0x1004", "0x1008", "0x100C"]
    )
    assert.equal(cells[2].value, 42)
})

for (const [index, question] of POINTER_QUESTIONS.entries()) {
    test(`grades the correct answer for ${question.id}`, () => {
        assert.equal(
            gradePointerAnswer(question, correctResponse(index)).correct,
            true
        )
        assert.equal(gradePointerAnswer(question, {}).correct, false)
    })
}

test("memory questions require both the correct pointer location and dereferenced value", () => {
    const question = POINTER_QUESTIONS[0]
    assert.equal(
        gradePointerAnswer(question, { cellIndex: 0, value: "42" }).correct,
        false
    )
    assert.equal(
        gradePointerAnswer(question, { cellIndex: 2, value: "0x1008" }).correct,
        false
    )
    assert.equal(
        gradePointerAnswer(question, { cellIndex: 2, value: "4104" }).correct,
        false
    )
    assert.equal(
        gradePointerAnswer(question, { cellIndex: 2, value: "25" }).correct,
        false
    )
    for (const value of ["", "  ", "42oops", "42.5", "4.2e1", "Infinity"])
        assert.equal(
            gradePointerAnswer(question, { cellIndex: 2, value }).correct,
            false
        )
    assert.equal(
        gradePointerAnswer(question, { cellIndex: 2, value: " 42 " }).correct,
        true
    )
})

test("array arithmetic locates p independently of the neighboring read", () => {
    const question = POINTER_QUESTIONS.find((item) => item.id === "array-step")!
    assert.equal(
        gradePointerAnswer(question, { cellIndex: 2, value: "15" }).correct,
        false
    )
    assert.equal(
        gradePointerAnswer(question, { cellIndex: 1, value: "10" }).correct,
        false
    )
    assert.equal(
        gradePointerAnswer(question, { cellIndex: 2, value: "10" }).correct,
        true
    )
})

test("retries preserve first-try score; correct answers cannot be edited or submitted twice", () => {
    const question = POINTER_QUESTIONS[0]
    let state = initialQuizProgress()
    state = pointerQuizReducer(state, {
        type: "quiz-response",
        id: question.id,
        response: { cellIndex: 0, value: "42" },
    })
    state = pointerQuizReducer(state, {
        type: "submit-answer",
        id: question.id,
    })
    assert.equal(state.answers[question.id].firstTryCorrect, false)
    state = pointerQuizReducer(state, {
        type: "quiz-response",
        id: question.id,
        response: correctResponse(0),
    })
    assert.equal(state.answers[question.id].checked, false)
    state = pointerQuizReducer(state, {
        type: "submit-answer",
        id: question.id,
    })
    assert.equal(state.answers[question.id].attempts, 2)
    assert.equal(state.answers[question.id].firstTryCorrect, false)
    assert.equal(quizCorrectCount(state), 1)
    assert.equal(
        pointerQuizReducer(state, { type: "submit-answer", id: question.id }),
        state
    )
    assert.equal(
        pointerQuizReducer(state, {
            type: "quiz-response",
            id: question.id,
            response: { value: "9" },
        }),
        state
    )
})

test("completion, results, persistence, and retaking are consistent", () => {
    let state = initialQuizProgress()
    assert.equal(
        pointerQuizReducer(state, { type: "quiz-results" }).showResults,
        false
    )
    for (const [index, question] of POINTER_QUESTIONS.entries()) {
        state = pointerQuizReducer(state, {
            type: "quiz-response",
            id: question.id,
            response: correctResponse(index),
        })
        state = pointerQuizReducer(state, {
            type: "submit-answer",
            id: question.id,
        })
    }
    assert.equal(isQuizComplete(state), true)
    state = pointerQuizReducer(state, { type: "quiz-results" })
    assert.equal(state.showResults, true)
    assert.deepEqual(
        restoreQuizProgress(JSON.parse(JSON.stringify(state))),
        state
    )
    const reset = pointerQuizReducer(state, { type: "reset-quiz" })
    assert.equal(isQuizComplete(reset), false)
    assert.deepEqual(reset.answers, {})
})

test("invalid saved quiz progress is ignored", () => {
    assert.deepEqual(restoreQuizProgress(null), initialQuizProgress())
    assert.deepEqual(
        restoreQuizProgress({
            question: -2,
            answers: { "follow-address": { response: null, attempts: "bad" } },
            showResults: true,
        }),
        initialQuizProgress()
    )
})
