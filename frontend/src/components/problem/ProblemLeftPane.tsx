import { useState } from "react"
import {
    FileText,
    History,
    Code2,
    ChevronRight,
    CheckCircle2,
    XCircle,
} from "lucide-react"
import type { Problem, ProblemLeftTab, Submission } from "@/types"
import {
    DifficultyBadge,
    SubmissionStatusBadge,
} from "@/components/common/StatusBadges"
import { Button } from "@/components/ui/button"

interface ProblemLeftPaneProps {
    problem: Problem
    submissions: Submission[]
    activeTab: ProblemLeftTab
    setActiveTab: (tab: ProblemLeftTab) => void
    onSelectSubmission?: (sub: Submission) => void
}

export function ProblemLeftPane({
    problem,
    submissions,
    activeTab,
    setActiveTab,
    onSelectSubmission,
}: ProblemLeftPaneProps) {
    const [selectedSubDetail, setSelectedSubDetail] =
        useState<Submission | null>(null)

    const problemSubmissions = submissions.filter(
        (s) => s.problemId === problem.id
    )

    return (
        <div className="flex h-full flex-col overflow-hidden border-r border-border bg-background select-text">
            {/* Tab Navigation Header */}
            <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/30 px-3 py-1.5 text-xs">
                <button
                    onClick={() => {
                        setActiveTab("description")
                        setSelectedSubDetail(null)
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                        activeTab === "description"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                >
                    <FileText className="size-3.5 text-blue-500" />
                    <span>Description</span>
                </button>

                <button
                    onClick={() => {
                        setActiveTab("submissions")
                        setSelectedSubDetail(null)
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                        activeTab === "submissions"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                >
                    <History className="size-3.5 text-emerald-500" />
                    <span>Submissions</span>
                    {problemSubmissions.length > 0 && (
                        <span className="py-0.2 ml-0.5 rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                            {problemSubmissions.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Pane Content Area */}
            <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
                {/* TAB 1: DESCRIPTION */}
                {activeTab === "description" && (
                    <div className="space-y-6">
                        {/* Title & Stats */}
                        <div className="space-y-2 border-b border-border/70 pb-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                    {problem.numericId}. {problem.title}
                                </h1>
                                <DifficultyBadge
                                    difficulty={problem.difficulty}
                                />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                                Assignment Category: {problem.category}
                            </span>
                        </div>

                        {/* Description Text */}
                        <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
                            {problem.description
                                .split("\n\n")
                                .map((paragraph, idx) => (
                                    <p
                                        key={idx}
                                        className="whitespace-pre-line"
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                        </div>

                        {/* Examples Section */}
                        <div className="space-y-4 pt-2">
                            <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Examples
                            </h2>
                            {problem.examples.map((example) => (
                                <div
                                    key={example.id}
                                    className="space-y-2 rounded-lg border border-border bg-muted/20 p-3.5 font-mono text-xs"
                                >
                                    <div className="font-sans text-xs font-semibold text-foreground">
                                        Example {example.id}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                                            <span className="min-w-16 text-muted-foreground">
                                                Input:
                                            </span>
                                            <span className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground">
                                                {example.input}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                                            <span className="min-w-16 text-muted-foreground">
                                                Output:
                                            </span>
                                            <span className="rounded bg-muted/60 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                                {example.output}
                                            </span>
                                        </div>
                                        {example.explanation && (
                                            <div className="flex flex-col gap-1 pt-1 font-sans text-xs text-muted-foreground sm:flex-row sm:items-start">
                                                <span className="min-w-16 font-mono">
                                                    Explanation:
                                                </span>
                                                <span>
                                                    {example.explanation}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Constraints */}
                        <div className="space-y-2 pt-2">
                            <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Constraints
                            </h2>
                            <ul className="list-inside list-disc space-y-1.5 font-mono text-xs text-foreground/90">
                                {problem.constraints.map((constraint, idx) => (
                                    <li key={idx} className="leading-normal">
                                        <span className="rounded bg-muted/50 px-1.5 py-0.5">
                                            {constraint}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* TAB 2: SUBMISSIONS */}
                {activeTab === "submissions" && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-base font-bold text-foreground">
                                Submission History
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Evaluated by backend worker queue
                            </p>
                        </div>

                        {selectedSubDetail ? (
                            /* Detailed view for a single submission */
                            <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-xs">
                                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                                    <div className="flex items-center gap-2">
                                        <SubmissionStatusBadge
                                            status={selectedSubDetail.status}
                                        />
                                        <span className="font-mono font-semibold text-foreground">
                                            {selectedSubDetail.language}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() =>
                                            setSelectedSubDetail(null)
                                        }
                                    >
                                        Back to list
                                    </Button>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    Job ID:{" "}
                                    <span className="font-mono text-foreground">
                                        {selectedSubDetail.id}
                                    </span>{" "}
                                    • {selectedSubDetail.timestamp}
                                </div>

                                {selectedSubDetail.compileError && (
                                    <div className="rounded border border-destructive/20 bg-destructive/10 p-3 font-mono text-[11px] whitespace-pre-wrap text-destructive">
                                        {selectedSubDetail.compileError}
                                    </div>
                                )}

                                {selectedSubDetail.testResults &&
                                    selectedSubDetail.testResults.length >
                                        0 && (
                                        <div className="space-y-2">
                                            <span className="block font-bold text-foreground">
                                                Worker Test Results (
                                                {selectedSubDetail.testsPassed}/
                                                {selectedSubDetail.totalTests}{" "}
                                                passed)
                                            </span>
                                            <div className="space-y-1.5">
                                                {selectedSubDetail.testResults.map(
                                                    (t, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between rounded border border-border/60 bg-muted/20 p-2"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {t.passed ? (
                                                                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                                                                ) : (
                                                                    <XCircle className="size-3.5 text-rose-500" />
                                                                )}
                                                                <span className="font-medium text-foreground">
                                                                    {t.name}
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                                {t.passed
                                                                    ? "PASSED"
                                                                    : "FAILED"}
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Submitted Code snapshot */}
                                <div className="space-y-1.5">
                                    <span className="block font-bold text-foreground">
                                        Submitted Code:
                                    </span>
                                    <pre className="max-h-48 overflow-y-auto rounded bg-muted/50 p-2.5 font-mono text-[11px]">
                                        {selectedSubDetail.code}
                                    </pre>
                                </div>
                            </div>
                        ) : problemSubmissions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center">
                                <Code2 className="size-8 text-muted-foreground/50" />
                                <p className="text-sm font-medium text-foreground">
                                    No submissions yet
                                </p>
                                <p className="max-w-xs text-xs text-muted-foreground">
                                    Write your solution in C and click "Submit"
                                    to send it to the backend worker queue.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {problemSubmissions.map((sub) => (
                                    <div
                                        key={sub.id}
                                        onClick={() => {
                                            setSelectedSubDetail(sub)
                                            onSelectSubmission?.(sub)
                                        }}
                                        className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-3 text-xs transition-colors hover:bg-muted/30"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <SubmissionStatusBadge
                                                    status={sub.status}
                                                />
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    {sub.language}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                <span>{sub.timestamp}</span>
                                                {sub.totalTests > 0 && (
                                                    <span>
                                                        Tests: {sub.testsPassed}
                                                        /{sub.totalTests} passed
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <ChevronRight className="size-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
