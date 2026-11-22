import {
    POINTER_CHAPTERS,
    POINTER_QUESTIONS,
    gradePointerAnswer,
    type QuizResponse,
} from "../data/pointers.ts"

import {
    initialLessonProgress,
    lessonProgressReducer,
    restoreLessonProgress,
    type LessonProgress,
    type LessonProgressAction,
} from "./lessonProgress.ts"
import { clamp, index, record } from "./progressValidation.ts"

const pointerSections = POINTER_CHAPTERS.map(({ id, frames }) => ({
    id,
    stepCount: frames.length,
}))

export interface QuestionProgress {
    response: QuizResponse
    checked: boolean
    attempts: number
    firstTryCorrect: boolean | null
}
export interface LearningProgress {
    lecture: LessonProgress
    quiz: {
        question: number
        answers: Record<string, QuestionProgress>
        showResults: boolean
    }
}
export type LearningAction =
    | LessonProgressAction
    | { type: "quiz-response"; id: string; response: QuizResponse }
    | { type: "submit-answer"; id: string }
    | { type: "quiz-question"; index: number }
    | { type: "quiz-results" }
    | { type: "reset-quiz" }

export function initialLearningProgress(): LearningProgress {
    return {
        lecture: initialLessonProgress(),
        quiz: { question: 0, answers: {}, showResults: false },
    }
}
export function initialQuestionProgress(): QuestionProgress {
    return {
        response: { cellIndex: 0, value: "", choice: "" },
        checked: false,
        attempts: 0,
        firstTryCorrect: null,
    }
}
export function quizCorrectCount(progress: LearningProgress): number {
    return POINTER_QUESTIONS.filter((question) => {
        const answer = progress.quiz.answers[question.id]
        return (
            answer?.checked &&
            gradePointerAnswer(question, answer.response).correct
        )
    }).length
}
export function isQuizComplete(progress: LearningProgress): boolean {
    return quizCorrectCount(progress) === POINTER_QUESTIONS.length
}
export function learningReducer(
    state: LearningProgress,
    action: LearningAction
): LearningProgress {
    switch (action.type) {
        case "lesson-step":
        case "complete-lesson": {
            const lecture = lessonProgressReducer(
                state.lecture,
                action,
                pointerSections
            )
            return lecture === state.lecture ? state : { ...state, lecture }
        }
        case "quiz-response": {
            const question = POINTER_QUESTIONS.find(
                (item) => item.id === action.id
            )
            if (!question) return state
            const previous =
                state.quiz.answers[action.id] ?? initialQuestionProgress()
            if (
                previous.checked &&
                gradePointerAnswer(question, previous.response).correct
            )
                return state
            return {
                ...state,
                quiz: {
                    ...state.quiz,
                    answers: {
                        ...state.quiz.answers,
                        [action.id]: {
                            ...previous,
                            response: {
                                ...previous.response,
                                ...action.response,
                            },
                            checked: false,
                        },
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
                state.quiz.answers[action.id] ?? initialQuestionProgress()
            const correct = gradePointerAnswer(
                question,
                previous.response
            ).correct
            if (previous.checked && correct) return state
            return {
                ...state,
                quiz: {
                    ...state.quiz,
                    answers: {
                        ...state.quiz.answers,
                        [action.id]: {
                            ...previous,
                            checked: true,
                            attempts: previous.attempts + 1,
                            firstTryCorrect:
                                previous.firstTryCorrect ?? correct,
                        },
                    },
                },
            }
        }
        case "quiz-question":
            return {
                ...state,
                quiz: {
                    ...state.quiz,
                    question: clamp(action.index, POINTER_QUESTIONS.length - 1),
                    showResults: false,
                },
            }
        case "quiz-results":
            return isQuizComplete(state)
                ? { ...state, quiz: { ...state.quiz, showResults: true } }
                : state
        case "reset-quiz":
            return { ...state, quiz: initialLearningProgress().quiz }
    }
}

export function restoreLearningProgress(raw: string | null): LearningProgress {
    const fresh = initialLearningProgress()
    if (!raw) return fresh
    try {
        const saved: unknown = JSON.parse(raw)
        if (!record(saved) || saved.version !== 1) return fresh
        fresh.lecture = restoreLessonProgress(saved.lecture, pointerSections)
        if (record(saved.quiz)) {
            fresh.quiz.question = index(
                saved.quiz.question,
                POINTER_QUESTIONS.length - 1
            )
            if (record(saved.quiz.answers)) {
                for (const question of POINTER_QUESTIONS) {
                    const entry = saved.quiz.answers[question.id]
                    if (!record(entry) || !record(entry.response)) continue
                    const response: QuizResponse = {
                        cellIndex: index(
                            entry.response.cellIndex,
                            question.kind === "memory"
                                ? question.cells.length - 1
                                : 0
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
                    fresh.quiz.answers[question.id] = {
                        response,
                        checked: entry.checked === true && attempts > 0,
                        attempts,
                        firstTryCorrect:
                            typeof entry.firstTryCorrect === "boolean" &&
                            attempts > 0
                                ? entry.firstTryCorrect
                                : null,
                    }
                }
            }
            fresh.quiz.showResults =
                saved.quiz.showResults === true && isQuizComplete(fresh)
        }
        return fresh
    } catch {
        return initialLearningProgress()
    }
}
