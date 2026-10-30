import { useState } from "react"
import type { Submission, Problem } from "@/types"
import { SubmissionStatusBadge } from "@/components/common/StatusBadges"
import { ExternalLink, Feather } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GlobalSubmissionsViewProps {
    submissions: Submission[]
    problems: Problem[]
    onSelectProblem: (problem: Problem) => void
}

export function GlobalSubmissionsView({
    submissions,
    problems,
    onSelectProblem,
}: GlobalSubmissionsViewProps) {
    const [filterStatus, setFilterStatus] = useState<string>("All")

    const filteredSubmissions = submissions.filter((sub) => {
        if (filterStatus === "All") return true
        return sub.status === filterStatus
    })

    return (
        <section
            className="collection-page page-enter"
            aria-labelledby="submissions-heading"
        >
            <div className="collection-inner">
                <div className="collection-hero">
                    <div>
                        <h1
                            id="submissions-heading"
                            className="editorial-title text-4xl leading-[1.15] md:text-5xl"
                        >
                            Submissions
                        </h1>
                        <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                            Review submitted solutions and their results.
                        </p>
                    </div>
                    <div className="border-l border-primary/25 pl-6">
                        <p className="eyebrow">Submissions</p>
                        <p className="mt-2 font-heading text-4xl">
                            {submissions.length}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            submitted solutions
                        </p>
                    </div>
                </div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <h2 className="font-heading text-2xl tracking-tight">
                        Submission history
                    </h2>
                    <div
                        className="flex flex-wrap items-center gap-0.5"
                        role="group"
                        aria-label="Filter submission status"
                    >
                        {[
                            "All",
                            "Accepted",
                            "Wrong Answer",
                            "Compile Error",
                        ].map((st) => (
                            <button
                                key={st}
                                onClick={() => setFilterStatus(st)}
                                className="filter-button"
                                aria-pressed={filterStatus === st}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submissions Table */}
                <div className="overflow-hidden rounded-lg border border-border bg-card/80">
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3">Problem</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Runtime</th>
                                    <th className="px-4 py-3">Memory</th>
                                    <th className="px-4 py-3">Language</th>
                                    <th className="px-4 py-3 text-right">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredSubmissions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="py-16! text-center text-muted-foreground"
                                        >
                                            <Feather className="mx-auto mb-5 size-7 stroke-1 text-primary/70" />
                                            <p className="font-heading text-2xl text-foreground">
                                                {submissions.length === 0
                                                    ? "No submissions yet"
                                                    : "No matching submissions"}
                                            </p>
                                            <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed">
                                                {submissions.length === 0
                                                    ? "Submit a solution from the workspace to see its results here."
                                                    : "Try a different status filter."}
                                            </p>
                                            {submissions.length === 0 &&
                                                problems[0] && (
                                                    <Button
                                                        variant="outline"
                                                        className="mt-6"
                                                        onClick={() =>
                                                            onSelectProblem(
                                                                problems[0]
                                                            )
                                                        }
                                                    >
                                                        Start an assignment{" "}
                                                        <ExternalLink className="size-3.5" />
                                                    </Button>
                                                )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSubmissions.map((sub) => {
                                        const targetProblem = problems.find(
                                            (p) => p.id === sub.problemId
                                        )
                                        return (
                                            <tr
                                                key={sub.id}
                                                className="transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-3 font-mono whitespace-nowrap text-muted-foreground">
                                                    {sub.timestamp}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-foreground">
                                                    {sub.problemTitle}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <SubmissionStatusBadge
                                                        status={sub.status}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-mono">
                                                    {sub.runtimeMs !== undefined
                                                        ? `${sub.runtimeMs} ms`
                                                        : "--"}
                                                </td>
                                                <td className="px-4 py-3 font-mono">
                                                    {sub.memoryMb !== undefined
                                                        ? `${sub.memoryMb} MB`
                                                        : "--"}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-muted-foreground">
                                                    {sub.language}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {targetProblem && (
                                                        <Button
                                                            variant="ghost"
                                                            size="xs"
                                                            onClick={() =>
                                                                onSelectProblem(
                                                                    targetProblem
                                                                )
                                                            }
                                                            className="gap-1 text-xs"
                                                        >
                                                            <span>Open</span>
                                                            <ExternalLink className="size-3" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    )
}
