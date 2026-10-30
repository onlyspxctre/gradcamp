import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Clock,
    ListChecks,
} from "lucide-react"
import type { LearningAssignment } from "@/types"
import {
    POINTERS_LECTURE,
    POINTERS_QUIZ,
    ASSIGNMENT_KIND_LABELS,
} from "@/data/assignments"
import { POINTER_CHAPTERS, POINTER_QUESTIONS } from "@/data/pointers"
import { useLearning } from "@/context/LearningContext"
import { isQuizComplete } from "@/lib/learningProgress"
import { Button } from "@/components/ui/button"
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
        <section
            className="collection-page page-enter"
            aria-labelledby="learning-assignment-heading"
        >
            <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
                <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                    >
                        <ArrowLeft className="size-3.5" />
                        Assignments
                    </button>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Clock className="size-3" />
                            {assignment.estimatedMinutes} min
                        </span>
                        <span>Local progress</span>
                    </div>
                </div>
                <header className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
                    <div className="max-w-2xl">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                            <span className="eyebrow flex items-center gap-1.5">
                                {isLecture ? (
                                    <BookOpen className="size-3" />
                                ) : (
                                    <ListChecks className="size-3" />
                                )}
                                {ASSIGNMENT_KIND_LABELS[assignment.kind]} /{" "}
                                {String(assignment.numericId).padStart(2, "0")}
                            </span>
                            {/* Reserve the badge's height so completion cannot shift the controls below. */}
                            <span
                                aria-hidden={!completed}
                                className={`flex items-center gap-1 text-[11px] text-success ${completed ? "" : "invisible"}`}
                            >
                                <CheckCircle2 className="size-3" />
                                Completed
                            </span>
                        </div>
                        <h1
                            id="learning-assignment-heading"
                            className="editorial-title text-3xl md:text-4xl"
                        >
                            {assignment.title}
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {assignment.description}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() =>
                            onSelectAssignment(
                                isLecture ? POINTERS_QUIZ : POINTERS_LECTURE
                            )
                        }
                    >
                        {isLecture ? "Open memory lab" : "Open lecture"}
                        <ArrowRight className="size-3.5" />
                    </Button>
                </header>
                {isLecture ? (
                    <PointerLesson
                        onOpenQuiz={() => onSelectAssignment(POINTERS_QUIZ)}
                    />
                ) : (
                    <PointerQuiz onReviewLesson={reviewLesson} />
                )}
                <footer className="mt-5 flex flex-wrap justify-between gap-2 text-[10px] leading-5 text-muted-foreground">
                    <span>
                        Simulated C memory · illustrative addresses · assume
                        sizeof(int) = 4 bytes
                    </span>
                    <span>
                        {isLecture
                            ? `${POINTER_CHAPTERS.length} sections`
                            : `${POINTER_QUESTIONS.length} questions`}{" "}
                        · Progress saved in this browser when storage is
                        available.
                    </span>
                </footer>
            </div>
        </section>
    )
}
