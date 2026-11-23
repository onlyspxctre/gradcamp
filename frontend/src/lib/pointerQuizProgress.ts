import {
    POINTER_QUESTIONS,
    gradePointerAnswer,
    type QuizResponse,
} from "../data/pointers.ts"
import { clamp, index, record } from "./progressValidation.ts"

export interface QuestionProgress {
    response: QuizResponse
    checked: boolean
    attempts: number
    firstTryCorrect: boolean | null
}
export interface PointerQuizProgress {
    question: number
    answers: Record<string, QuestionProgress>
    showResults: boolean
}

export type PointerQuizAction =
    | { type: "quiz-response"; id: string; response: QuizResponse }
    | { type: "submit-answer"; id: string }
    | { type: "quiz-question"; index: number }
    | { type: "quiz-results" }
    | { type: "reset-quiz" }

export function initialQuizProgress(): PointerQuizProgress {
    return { question: 0, answers: {}, showResults: false }
}
export function initialQuestionProgress(): QuestionProgress {
    return {
        response: { cellIndex: 0, value: "", choice: "" },
        checked: false,
        attempts: 0,
        firstTryCorrect: null,
    }
}
export function quizCorrectCount(progress: PointerQuizProgress): number {
    return POINTER_QUESTIONS.filter((question) => {
        const answer = progress.answers[question.id]
        return (
            answer?.checked &&
            gradePointerAnswer(question, answer.response).correct
        )
    }).length
}
export function isQuizComplete(progress: PointerQuizProgress): boolean {
    return quizCorrectCount(progress) === POINTER_QUESTIONS.length
}
export function pointerQuizReducer(
    state: PointerQuizProgress,
    action: PointerQuizAction
): PointerQuizProgress {
    switch (action.type) {
        case "quiz-response": {
            const question = POINTER_QUESTIONS.find(
                (item) => item.id === action.id
            )
            if (!question) return state
            const previous =
                state.answers[action.id] ?? initialQuestionProgress()
            if (
                previous.checked &&
                gradePointerAnswer(question, previous.response).correct
            )
                return state
            return {
                ...state,
                answers: {
                    ...state.answers,
                    [action.id]: {
                        ...previous,
                        response: {
                            ...previous.response,
                            ...action.response,
                        },
                        checked: false,
                    },
                },
            }
        }
        case "submit-answer": {
            const question = POINTER_QUESTIONS.find(
                (item) => item.id === action.id
            )
            if (!question) return state
            const previous =
                state.answers[action.id] ?? initialQuestionProgress()
            const correct = gradePointerAnswer(
                question,
                previous.response
            ).correct
            if (previous.checked && correct) return state
            return {
                ...state,
                answers: {
                    ...state.answers,
                    [action.id]: {
                        ...previous,
                        checked: true,
                        attempts: previous.attempts + 1,
                        firstTryCorrect: previous.firstTryCorrect ?? correct,
                    },
                },
            }
        }
        case "quiz-question":
            return {
                ...state,
                question: clamp(action.index, POINTER_QUESTIONS.length - 1),
                showResults: false,
            }
        case "quiz-results":
            return isQuizComplete(state)
                ? { ...state, showResults: true }
                : state
        case "reset-quiz":
            return initialQuizProgress()
    }
}

export function restoreQuizProgress(saved: unknown): PointerQuizProgress {
    const fresh = initialQuizProgress()
    if (!record(saved)) return fresh
    fresh.question = index(saved.question, POINTER_QUESTIONS.length - 1)
    if (record(saved.answers)) {
        for (const question of POINTER_QUESTIONS) {
            const entry = saved.answers[question.id]
            if (!record(entry) || !record(entry.response)) continue
            const response: QuizResponse = {
                cellIndex: index(
                    entry.response.cellIndex,
                    question.kind === "memory" ? question.cells.length - 1 : 0
                ),
                value:
                    typeof entry.response.value === "string"
                        ? entry.response.value.slice(0, 100)
                        : "",
                choice:
                    typeof entry.response.choice === "string"
                        ? entry.response.choice
                        : "",
            }
            const attempts =
                typeof entry.attempts === "number" &&
                Number.isFinite(entry.attempts)
                    ? Math.max(0, Math.trunc(entry.attempts))
                    : 0
            fresh.answers[question.id] = {
                response,
                checked: entry.checked === true && attempts > 0,
                attempts,
                firstTryCorrect:
                    typeof entry.firstTryCorrect === "boolean" && attempts > 0
                        ? entry.firstTryCorrect
                        : null,
            }
        }
    }
    fresh.showResults = saved.showResults === true && isQuizComplete(fresh)
    return fresh
}
