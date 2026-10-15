import { useState } from "react"
import type { Problem, Difficulty, Submission } from "@/types"
import { DifficultyBadge } from "@/components/common/StatusBadges"
import { Search, CheckCircle2, Clock, BookOpen } from "lucide-react"

interface ProblemListViewProps {
    problems: Problem[]
    submissions: Submission[]
    onSelectProblem: (problem: Problem) => void
}

export function ProblemListView({
    problems,
    submissions,
    onSelectProblem,
}: ProblemListViewProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedDifficulty, setSelectedDifficulty] = useState<
        Difficulty | "All"
    >("All")

    const filteredProblems = problems.filter((problem) => {
        const matchesSearch =
            problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            problem.numericId.toString().includes(searchQuery)

        const matchesDiff =
            selectedDifficulty === "All" ||
            problem.difficulty === selectedDifficulty

        return matchesSearch && matchesDiff
    })

    const getProblemStatus = (problemId: string) => {
        const subs = submissions.filter((s) => s.problemId === problemId)
        if (subs.some((s) => s.status === "Accepted")) return "solved"
        if (subs.length > 0) return "attempted"
        return "todo"
    }

    return (
        <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 overflow-y-auto bg-background p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
                        <BookOpen className="size-6 text-primary" />
                        <span>Assignments</span>
                    </h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Select an assignment to open in the interactive
                        workspace and submit for autograding
                    </p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search assignments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-1.5 pr-3 pl-9 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                    />
                </div>

                {/* Difficulty Filter Pills */}
                <div className="flex w-full items-center gap-1.5 sm:w-auto">
                    {(["All", "Easy", "Medium", "Hard"] as const).map(
                        (diff) => (
                            <button
                                key={diff}
                                onClick={() => setSelectedDifficulty(diff)}
                                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                    selectedDifficulty === diff
                                        ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                            >
                                {diff}
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Assignments Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                        <tr>
                            <th className="w-12 px-4 py-3 text-center">
                                Status
                            </th>
                            <th className="px-4 py-3">Title</th>
                            <th className="w-28 px-4 py-3">Difficulty</th>
                            <th className="hidden w-40 px-4 py-3 sm:table-cell">
                                Category
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {filteredProblems.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    No assignments found.
                                </td>
                            </tr>
                        ) : (
                            filteredProblems.map((problem) => {
                                const status = getProblemStatus(problem.id)
                                return (
                                    <tr
                                        key={problem.id}
                                        onClick={() => onSelectProblem(problem)}
                                        className="group cursor-pointer transition-colors hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 text-center">
                                            {status === "solved" ? (
                                                <CheckCircle2 className="inline size-4 text-emerald-500" />
                                            ) : status === "attempted" ? (
                                                <Clock className="inline size-4 text-amber-500" />
                                            ) : (
                                                <span className="inline-block size-2 rounded-full bg-border" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
                                                {problem.numericId}.{" "}
                                                {problem.title}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <DifficultyBadge
                                                difficulty={problem.difficulty}
                                            />
                                        </td>
                                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                                            {problem.category}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
