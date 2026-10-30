import {
    POINTER_CHAPTERS,
    POINTER_QUESTIONS,
    gradePointerAnswer,
    type QuizResponse,
} from "../data/pointers.ts"

export interface QuestionProgress {
    response: QuizResponse
    checked: boolean
    attempts: number
    firstTryCorrect: boolean | null
}
export interface LearningProgress {
    lecture: {
        chapter: number
        step: number
        viewed: string[]
        completed: boolean
    }
    quiz: {
        question: number
        answers: Record<string, QuestionProgress>
        showResults: boolean
    }
}
export type LearningAction =
    | { type: "lesson-step"; chapter: number; step: number }
    | { type: "complete-lesson" }
    | { type: "quiz-response"; id: string; response: QuizResponse }
    | { type: "submit-answer"; id: string }
    | { type: "quiz-question"; index: number }
    | { type: "quiz-results" }
    | { type: "reset-quiz" }

export function initialLearningProgress(): LearningProgress {
    return {
        lecture: { chapter: 0, step: 0, viewed: [], completed: false },
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
const clamp = (value: number, max: number) =>
    Math.max(0, Math.min(max, Number.isFinite(value) ? Math.trunc(value) : 0))

export function learningReducer(
    state: LearningProgress,
    action: LearningAction
): LearningProgress {
    switch (action.type) {
        case "lesson-step": {
            const chapter = clamp(action.chapter, POINTER_CHAPTERS.length - 1)
            const current = POINTER_CHAPTERS[chapter]
            const step = clamp(action.step, current.frames.length - 1)
            const viewed =
                step === current.frames.length - 1
                    ? [...new Set([...state.lecture.viewed, current.id])]
                    : state.lecture.viewed
            return {
                ...state,
                lecture: { ...state.lecture, chapter, step, viewed },
            }
        }
        case "complete-lesson":
            return state.lecture.viewed.length === POINTER_CHAPTERS.length
                ? { ...state, lecture: { ...state.lecture, completed: true } }
                : state
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

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}
function index(value: unknown, max: number): number {
    return typeof value === "number" ? clamp(value, max) : 0
}

export function restoreLearningProgress(raw: string | null): LearningProgress {
    const fresh = initialLearningProgress()
    if (!raw) return fresh
    try {
        const saved: unknown = JSON.parse(raw)
        if (!record(saved) || saved.version !== 1) return fresh
        if (record(saved.lecture)) {
            const chapter = index(
                saved.lecture.chapter,
                POINTER_CHAPTERS.length - 1
            )
            const savedViewed = saved.lecture.viewed
            const viewed = Array.isArray(savedViewed)
                ? POINTER_CHAPTERS.filter((item) =>
                      savedViewed.includes(item.id)
                  ).map((item) => item.id)
                : []
            fresh.lecture = {
                chapter,
                step: index(
                    saved.lecture.step,
                    POINTER_CHAPTERS[chapter].frames.length - 1
                ),
                viewed,
                completed:
                    saved.lecture.completed === true &&
                    viewed.length === POINTER_CHAPTERS.length,
            }
        }
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
