import type { ComponentType } from "react"
import { POINTERS_LECTURE, POINTERS_QUIZ } from "@/data/assignments"
import { POINTER_CHAPTERS, POINTER_QUESTIONS } from "@/data/pointers"
import {
    pointerLectureProgress,
    pointerQuizProgress,
} from "@/data/pointerProgressDefinitions"
import { useAssignmentProgress } from "@/context/LearningContext"
import {
    readProgress,
    type ProgressById,
    type ProgressCodec,
    type ProgressDefinition,
    type ProgressStatus,
} from "@/lib/assignmentProgress"
import { PointerLesson } from "./PointerLesson"
import { PointerQuiz } from "./PointerQuiz"

interface ActivityBodyProps {
    onOpenRelated?: () => void
}

interface LearningActivity {
    progress: ProgressCodec
    status: (state: ProgressById) => ProgressStatus
    Body: ComponentType<ActivityBodyProps>
    related?: { assignmentId: string; label: string }
    itemSummary: string
    footerNote?: string
}

function defineActivity<State, Action>(
    progress: ProgressDefinition<State, Action>,
    view: Omit<LearningActivity, "progress" | "status">
): LearningActivity {
    return {
        ...view,
        progress,
        status: (state) => progress.status(readProgress(state, progress)),
    }
}

const memoryNote =
    "Simulated C memory · illustrative addresses · assume sizeof(int) = 4 bytes"

function PointerQuizBody({ onOpenRelated }: ActivityBodyProps) {
    const { dispatch } = useAssignmentProgress(pointerLectureProgress)
    return (
        <PointerQuiz
            onReviewLesson={(chapterId) => {
                const chapter = POINTER_CHAPTERS.findIndex(
                    (item) => item.id === chapterId
                )
                dispatch({
                    type: "lesson-step",
                    chapter: Math.max(0, chapter),
                    step: 0,
                })
                onOpenRelated?.()
            }}
        />
    )
}

const activities = [
    defineActivity(pointerLectureProgress, {
        Body: ({ onOpenRelated }) => (
            <PointerLesson onOpenQuiz={onOpenRelated} />
        ),
        related: { assignmentId: POINTERS_QUIZ.id, label: "Open memory lab" },
        itemSummary: `${POINTER_CHAPTERS.length} sections`,
        footerNote: memoryNote,
    }),
    defineActivity(pointerQuizProgress, {
        Body: PointerQuizBody,
        related: { assignmentId: POINTERS_LECTURE.id, label: "Open lecture" },
        itemSummary: `${POINTER_QUESTIONS.length} questions`,
        footerNote: memoryNote,
    }),
]

const byId = new Map(
    activities.map((activity) => [activity.progress.id, activity])
)
export const learningProgressCodecs = activities.map(({ progress }) => progress)
export const getLearningActivity = (id: string) => byId.get(id)
