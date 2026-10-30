import { useState } from "react"
import type { Assignment, Difficulty, Submission } from "@/types"
import { ASSIGNMENT_KIND_LABELS } from "@/data/assignments"
import { useLearning } from "@/context/LearningContext"
import { isQuizComplete } from "@/lib/learningProgress"
import { DifficultyBadge } from "@/components/common/StatusBadges"
import { Search, CheckCircle2, Clock, ArrowUpRight } from "lucide-react"

interface ProblemListViewProps {
    problems: Assignment[]
    submissions: Submission[]
    onSelectProblem: (problem: Assignment) => void
}

export function ProblemListView({
    problems,
    submissions,
    onSelectProblem,
}: ProblemListViewProps) {
    const { progress } = useLearning()
    const [selectedKind, setSelectedKind] = useState<
        Assignment["kind"] | "all"
    >("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedDifficulty, setSelectedDifficulty] = useState<
        Difficulty | "All"
    >("All")

    const filteredProblems = problems.filter((problem) => {
        const matchesSearch =
            problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            problem.numericId.toString().includes(searchQuery)
        return (
            matchesSearch &&
            (selectedKind === "all" || problem.kind === selectedKind) &&
            (selectedDifficulty === "All" ||
                problem.difficulty === selectedDifficulty)
        )
    })

    const getProblemStatus = (problemId: string) => {
        const assignment = problems.find((item) => item.id === problemId)
        if (assignment?.kind === "lecture")
            return progress.lecture.completed
                ? "solved"
                : progress.lecture.viewed.length > 0 ||
                    progress.lecture.step > 0 ||
                    progress.lecture.chapter > 0
                  ? "attempted"
                  : "todo"
        if (assignment?.kind === "quiz")
            return isQuizComplete(progress)
                ? "solved"
                : Object.keys(progress.quiz.answers).length > 0
                  ? "attempted"
                  : "todo"
        const subs = submissions.filter((s) => s.problemId === problemId)
        if (subs.some((s) => s.status === "Accepted")) return "solved"
        if (subs.length > 0) return "attempted"
        return "todo"
    }
    const solvedCount = problems.filter(
        (problem) => getProblemStatus(problem.id) === "solved"
    ).length

    return (
        <section
            className="collection-page page-enter"
            aria-labelledby="assignments-heading"
        >
            <div className="collection-inner">
                <div className="collection-hero">
                    <div>
                        <h1
                            id="assignments-heading"
                            className="editorial-title text-4xl leading-[1.15] md:text-5xl"
                        >
                            Assignments
                        </h1>
                        <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                            Browse assignments and open one in the workspace.
                        </p>
                    </div>
                    <div className="min-w-40 border-l border-primary/25 pl-6">
                        <p className="eyebrow">Your progress</p>
                        <p className="mt-2 font-heading text-4xl text-foreground">
                            {solvedCount}
                            <span className="ml-2 text-2xl text-muted-foreground">
                                / {problems.length}
                            </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            assignments completed
                        </p>
                        <div
                            className="mt-4 h-0.5 w-36 overflow-hidden bg-border"
                            role="progressbar"
                            aria-label="Assignments completed"
                            aria-valuenow={solvedCount}
                            aria-valuemin={0}
                            aria-valuemax={problems.length || 1}
                        >
                            <div
                                className="h-full bg-primary transition-[width]"
                                style={{
                                    width: `${problems.length ? (solvedCount / problems.length) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-baseline gap-3">
                        <h2 className="font-heading text-2xl tracking-tight">
                            Assignment list
                        </h2>
                        <span className="font-mono text-[11px] text-muted-foreground">
                            {String(filteredProblems.length).padStart(2, "0")}
                        </span>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                        <div className="relative min-w-48 flex-1 sm:w-56">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="search"
                                aria-label="Search assignments"
                                placeholder="Find an assignment…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 w-full rounded-md border border-border bg-card/70 pr-3 pl-9 text-xs placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                            />
                        </div>
                        <div
                            className="flex items-center gap-0.5"
                            role="group"
                            aria-label="Filter by difficulty"
                        >
                            {(["All", "Easy", "Medium", "Hard"] as const).map(
                                (diff) => (
                                    <button
                                        key={diff}
                                        onClick={() =>
                                            setSelectedDifficulty(diff)
                                        }
                                        className="filter-button"
                                        aria-pressed={
                                            selectedDifficulty === diff
                                        }
                                    >
                                        {diff}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className="mb-5 flex flex-wrap items-center gap-1"
                    role="group"
                    aria-label="Filter by assignment type"
                >
                    {(["all", "code", "lecture", "quiz"] as const).map(
                        (kind) => (
                            <button
                                key={kind}
                                onClick={() => setSelectedKind(kind)}
                                className="filter-button"
                                aria-pressed={selectedKind === kind}
                            >
                                {kind === "all"
                                    ? "All types"
                                    : ASSIGNMENT_KIND_LABELS[kind]}
                            </button>
                        )
                    )}
                </div>
                <div className="overflow-hidden rounded-lg border border-border bg-card/80">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-14 text-center">No.</th>
                                <th>Assignment</th>
                                <th className="hidden sm:table-cell">Topic</th>
                                <th>Level</th>
                                <th className="w-16">
                                    <span className="sr-only">Progress</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProblems.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-14! text-center text-muted-foreground"
                                    >
                                        No assignments match. Try another search
                                        or filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredProblems.map((problem) => {
                                    const status = getProblemStatus(problem.id)
                                    return (
                                        <tr key={problem.id} className="group">
                                            <td className="text-center font-mono text-[11px] text-muted-foreground">
                                                {String(
                                                    problem.numericId
                                                ).padStart(2, "0")}
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() =>
                                                        onSelectProblem(problem)
                                                    }
                                                    className="flex items-center gap-3 text-left font-medium text-foreground transition-colors hover:text-primary"
                                                >
                                                    {problem.title}
                                                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                </button>
                                                <span className="mt-1.5 inline-block rounded-sm bg-secondary/70 px-1.5 py-0.5 text-[10px] font-normal text-secondary-foreground">
                                                    {
                                                        ASSIGNMENT_KIND_LABELS[
                                                            problem.kind
                                                        ]
                                                    }
                                                </span>
                                            </td>
                                            <td className="hidden text-xs text-muted-foreground sm:table-cell">
                                                {problem.category}
                                            </td>
                                            <td>
                                                <DifficultyBadge
                                                    difficulty={
                                                        problem.difficulty
                                                    }
                                                />
                                            </td>
                                            <td className="text-center">
                                                <span
                                                    className="inline-flex"
                                                    aria-label={
                                                        status === "solved"
                                                            ? "Completed"
                                                            : status ===
                                                                "attempted"
                                                              ? "Attempted"
                                                              : "Not started"
                                                    }
                                                    title={
                                                        status === "solved"
                                                            ? "Completed"
                                                            : status ===
                                                                "attempted"
                                                              ? "Attempted"
                                                              : "Not started"
                                                    }
                                                >
                                                    {status === "solved" ? (
                                                        <CheckCircle2 className="size-4 text-success" />
                                                    ) : status ===
                                                      "attempted" ? (
                                                        <Clock className="size-4 text-warning" />
                                                    ) : (
                                                        <span className="size-3 rounded-full border border-input" />
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}
