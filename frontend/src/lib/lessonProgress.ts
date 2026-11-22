import { clamp, index, record } from "./progressValidation.ts"

/** A lesson has at least one section, each with a unique ID and a positive step count. */
export interface LessonProgressSection {
    id: string
    stepCount: number
}

export interface LessonProgress {
    chapter: number
    step: number
    viewed: string[]
    completed: boolean
}

export type LessonProgressAction =
    | { type: "lesson-step"; chapter: number; step: number }
    | { type: "complete-lesson" }

export function initialLessonProgress(): LessonProgress {
    return { chapter: 0, step: 0, viewed: [], completed: false }
}

export function lessonProgressReducer(
    state: LessonProgress,
    action: LessonProgressAction,
    sections: readonly LessonProgressSection[]
): LessonProgress {
    switch (action.type) {
        case "lesson-step": {
            const chapter = clamp(action.chapter, sections.length - 1)
            const current = sections[chapter]
            const lastStep = current.stepCount - 1
            const step = clamp(action.step, lastStep)
            const viewed =
                step === lastStep
                    ? [...new Set([...state.viewed, current.id])]
                    : state.viewed
            return { ...state, chapter, step, viewed }
        }
        case "complete-lesson":
            return sections.every(({ id }) => state.viewed.includes(id))
                ? { ...state, completed: true }
                : state
    }
}

/** Validate the lecture portion of an already decoded save. */
export function restoreLessonProgress(
    saved: unknown,
    sections: readonly LessonProgressSection[]
): LessonProgress {
    if (!record(saved)) return initialLessonProgress()

    const chapter = index(saved.chapter, sections.length - 1)
    const savedViewed = saved.viewed
    const viewed = Array.isArray(savedViewed)
        ? sections
              .filter(({ id }) => savedViewed.includes(id))
              .map(({ id }) => id)
        : []
    return {
        chapter,
        step: index(saved.step, sections[chapter].stepCount - 1),
        viewed,
        completed:
            saved.completed === true && viewed.length === sections.length,
    }
}
