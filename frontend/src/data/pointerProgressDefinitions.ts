import { POINTERS_LECTURE, POINTERS_QUIZ } from "./assignments"
import { POINTER_CHAPTERS } from "./pointers"
import type { ProgressDefinition } from "@/lib/assignmentProgress"
import { defineLessonProgress } from "@/lib/lessonProgress"
import {
    initialQuizProgress,
    isQuizComplete,
    pointerQuizReducer,
    restoreQuizProgress,
    type PointerQuizAction,
    type PointerQuizProgress,
} from "@/lib/pointerQuizProgress"

const sections = POINTER_CHAPTERS.map(({ id, frames }) => ({
    id,
    stepCount: frames.length,
}))

export const pointerLectureProgress = defineLessonProgress(
    POINTERS_LECTURE.id,
    sections,
    "lecture"
)

export const pointerQuizProgress: ProgressDefinition<
    PointerQuizProgress,
    PointerQuizAction
> = {
    id: POINTERS_QUIZ.id,
    legacyKey: "quiz",
    initial: initialQuizProgress,
    restore: restoreQuizProgress,
    reduce: pointerQuizReducer,
    status: (state) =>
        isQuizComplete(state)
            ? "solved"
            : Object.keys(state.answers).length > 0
              ? "attempted"
              : "todo",
}
