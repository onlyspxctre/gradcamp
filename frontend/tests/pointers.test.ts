import test from "node:test"
import assert from "node:assert/strict"
import {
    POINTER_CHAPTERS,
    POINTER_QUESTIONS,
    formatAddress,
    makeMemory,
    gradePointerAnswer,
    type QuizResponse,
} from "../src/data/pointers.ts"
import {
    initialLearningProgress,
    isQuizComplete,
    learningReducer,
    quizCorrectCount,
    restoreLearningProgress,
} from "../src/lib/learningProgress.ts"

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

test("lecture completion requires finishing each section, and preserves navigation", () => {
    let state = initialLearningProgress()
    assert.equal(
        learningReducer(state, { type: "complete-lesson" }).lecture.completed,
        false
    )
    for (const [chapter, data] of POINTER_CHAPTERS.entries())
        state = learningReducer(state, {
            type: "lesson-step",
            chapter,
            step: data.frames.length - 1,
        })
    state = learningReducer(state, { type: "complete-lesson" })
    assert.equal(state.lecture.completed, true)
    state = learningReducer(state, { type: "lesson-step", chapter: 0, step: 1 })
    assert.equal(state.lecture.completed, true)
    assert.equal(state.lecture.viewed.length, POINTER_CHAPTERS.length)
})

test("retries preserve first-try score; correct answers cannot be edited or submitted twice", () => {
    const question = POINTER_QUESTIONS[0]
    let state = initialLearningProgress()
    state = learningReducer(state, {
        type: "quiz-response",
        id: question.id,
        response: { cellIndex: 0, value: "42" },
    })
    state = learningReducer(state, { type: "submit-answer", id: question.id })
    assert.equal(state.quiz.answers[question.id].firstTryCorrect, false)
    state = learningReducer(state, {
        type: "quiz-response",
        id: question.id,
        response: correctResponse(0),
    })
    assert.equal(state.quiz.answers[question.id].checked, false)
    state = learningReducer(state, { type: "submit-answer", id: question.id })
    assert.equal(state.quiz.answers[question.id].attempts, 2)
    assert.equal(state.quiz.answers[question.id].firstTryCorrect, false)
    assert.equal(quizCorrectCount(state), 1)
    assert.equal(
        learningReducer(state, { type: "submit-answer", id: question.id }),
        state
    )
    assert.equal(
        learningReducer(state, {
            type: "quiz-response",
            id: question.id,
            response: { value: "9" },
        }),
        state
    )
})

test("completion, results, persistence, and retaking are consistent", () => {
    let state = initialLearningProgress()
    assert.equal(
        learningReducer(state, { type: "quiz-results" }).quiz.showResults,
        false
    )
    for (const [index, question] of POINTER_QUESTIONS.entries()) {
        state = learningReducer(state, {
            type: "quiz-response",
            id: question.id,
            response: correctResponse(index),
        })
        state = learningReducer(state, {
            type: "submit-answer",
            id: question.id,
        })
    }
    assert.equal(isQuizComplete(state), true)
    state = learningReducer(state, { type: "quiz-results" })
    assert.equal(state.quiz.showResults, true)
    assert.deepEqual(
        restoreLearningProgress(JSON.stringify({ version: 1, ...state })),
        state
    )
    const reset = learningReducer(state, { type: "reset-quiz" })
    assert.equal(isQuizComplete(reset), false)
    assert.deepEqual(reset.lecture, state.lecture)
    assert.deepEqual(reset.quiz.answers, {})
})

test("corrupt, unknown-version, and out-of-range saved progress do not break the course", () => {
    for (const raw of [null, "broken JSON", "null", "[]", '{"version":2}'])
        assert.deepEqual(
            restoreLearningProgress(raw),
            initialLearningProgress()
        )
    const restored = restoreLearningProgress(
        JSON.stringify({
            version: 1,
            lecture: {
                chapter: 999,
                step: -50,
                viewed: ["unknown", "addresses", "addresses"],
                completed: true,
            },
            quiz: {
                question: -2,
                answers: {
                    "follow-address": { response: null, attempts: "bad" },
                },
                showResults: true,
            },
        })
    )
    assert.equal(restored.lecture.chapter, POINTER_CHAPTERS.length - 1)
    assert.equal(restored.lecture.step, 0)
    assert.deepEqual(restored.lecture.viewed, ["addresses"])
    assert.equal(restored.lecture.completed, false)
    assert.equal(restored.quiz.question, 0)
    assert.equal(restored.quiz.showResults, false)
    assert.equal(isQuizComplete(restored), false)
})
