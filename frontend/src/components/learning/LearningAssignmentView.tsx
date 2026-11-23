import { useId, type ReactNode } from "react"
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Clock,
    ListChecks,
} from "lucide-react"
import type { LearningAssignment } from "@/types"
import { ASSIGNMENT_KIND_LABELS } from "@/data/assignments"
import { Button } from "@/components/ui/button"

interface LearningAssignmentViewProps {
    assignment: Pick<
        LearningAssignment,
        "kind" | "numericId" | "title" | "description" | "estimatedMinutes"
    >
    completed: boolean
    onBack: () => void
    relatedAssignment?: { label: string; onOpen: () => void }
    itemSummary: string
    footerNote?: string
    children: ReactNode
}

export function LearningAssignmentView({
    assignment,
    completed,
    onBack,
    relatedAssignment,
    itemSummary,
    footerNote,
    children,
}: LearningAssignmentViewProps) {
    const headingId = useId()
    const isLecture = assignment.kind === "lecture"
    return (
        <section
            className="collection-page page-enter"
            aria-labelledby={headingId}
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
                            id={headingId}
                            className="editorial-title text-3xl md:text-4xl"
                        >
                            {assignment.title}
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {assignment.description}
                        </p>
                    </div>
                    {relatedAssignment && (
                        <Button
                            variant="outline"
                            onClick={relatedAssignment.onOpen}
                        >
                            {relatedAssignment.label}
                            <ArrowRight className="size-3.5" />
                        </Button>
                    )}
                </header>
                {children}
                <footer className="mt-5 flex flex-wrap justify-between gap-2 text-[10px] leading-5 text-muted-foreground">
                    {footerNote && <span>{footerNote}</span>}
                    <span>
                        {itemSummary} · Progress saved in this browser when
                        storage is available.
                    </span>
                </footer>
            </div>
        </section>
    )
}
