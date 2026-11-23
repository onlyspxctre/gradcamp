import type { LearningAssignment } from "@/types"
import { POINTERS_LECTURE, POINTERS_QUIZ } from "@/data/assignments"
import { POINTER_CHAPTERS, POINTER_QUESTIONS } from "@/data/pointers"
import { useLearning } from "@/context/LearningContext"
import { isQuizComplete } from "@/lib/learningProgress"
import { LearningAssignmentView } from "./LearningAssignmentView"
import { PointerLesson } from "./PointerLesson"
import { PointerQuiz } from "./PointerQuiz"

interface PointersAssignmentViewProps {
    assignment: LearningAssignment
    onSelectAssignment: (assignment: LearningAssignment) => void
    onBack: () => void
}

export function PointersAssignmentView({
    assignment,
    onSelectAssignment,
    onBack,
}: PointersAssignmentViewProps) {
    const { progress, dispatch } = useLearning()
    const isLecture = assignment.kind === "lecture"
    const completed = isLecture
        ? progress.lecture.completed
        : isQuizComplete(progress)
    const reviewLesson = (chapterId: string) => {
        const index = POINTER_CHAPTERS.findIndex(
            (chapter) => chapter.id === chapterId
        )
        dispatch({ type: "lesson-step", chapter: Math.max(0, index), step: 0 })
        onSelectAssignment(POINTERS_LECTURE)
    }
    return (
        <LearningAssignmentView
            assignment={assignment}
            completed={completed}
            onBack={onBack}
            relatedAssignment={{
                label: isLecture ? "Open memory lab" : "Open lecture",
                onOpen: () =>
                    onSelectAssignment(
                        isLecture ? POINTERS_QUIZ : POINTERS_LECTURE
                    ),
            }}
            itemSummary={
                isLecture
                    ? `${POINTER_CHAPTERS.length} sections`
                    : `${POINTER_QUESTIONS.length} questions`
            }
            footerNote="Simulated C memory · illustrative addresses · assume sizeof(int) = 4 bytes"
        >
            {isLecture ? (
                <PointerLesson
                    onOpenQuiz={() => onSelectAssignment(POINTERS_QUIZ)}
                />
            ) : (
                <PointerQuiz onReviewLesson={reviewLesson} />
            )}
        </LearningAssignmentView>
    )
}
