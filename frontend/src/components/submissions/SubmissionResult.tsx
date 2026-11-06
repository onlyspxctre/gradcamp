import type { ReactNode } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "cn"
import { SubmissionStatusBadge } from "@/components/common/StatusBadges"
import type { Submission } from "@/types"

interface SubmissionResultProps {
    submission: Submission
    variant?: "console" | "history"
    headerAction?: ReactNode
}

// Both panes render the same result data here. History adds its timestamp and
// source snapshot; the console keeps the compact test matrix presentation.
export function SubmissionResult({
    submission,
    variant = "console",
    headerAction,
}: SubmissionResultProps) {
    const history = variant === "history"
    const showTests =
        Boolean(submission.testResults?.length) &&
        (history || !submission.compileError)

    return (
        <section
            aria-label="Submission result"
            className={cn(
                "space-y-3",
                history &&
                    "space-y-4 rounded-lg border border-border bg-card p-4 text-xs"
            )}
        >
            <div
                className={cn(
                    "flex flex-wrap items-center justify-between gap-2 border-b border-border/80",
                    history ? "pb-3" : "pb-2"
                )}
            >
                <div className="flex items-center gap-2">
                    <SubmissionStatusBadge
                        status={submission.status}
                        className={history ? undefined : "px-3 py-1 text-sm"}
                    />
                    <span
                        className={cn(
                            "font-mono",
                            history
                                ? "font-semibold text-foreground"
                                : "text-xs text-muted-foreground"
                        )}
                    >
                        {submission.language}
                    </span>
                </div>
                {history ? (
                    headerAction
                ) : (
                    <span className="font-mono text-xs text-muted-foreground">
                        Job ID: {submission.id}
                    </span>
                )}
            </div>
            {history && (
                <div className="text-xs text-muted-foreground">
                    Job ID:{" "}
                    <span className="font-mono text-foreground">
                        {submission.id}
                    </span>{" "}
                    • {submission.timestamp}
                </div>
            )}
            {submission.compileError && (
                <div
                    className={cn(
                        "rounded border border-destructive/20 bg-destructive/10 p-3 font-mono whitespace-pre-wrap text-destructive",
                        history ? "text-[11px]" : "text-xs"
                    )}
                >
                    {submission.compileError}
                </div>
            )}
            {showTests && (
                <div className={history ? "space-y-2" : "space-y-1.5 pt-1"}>
                    <span
                        className={cn(
                            "block text-foreground",
                            history ? "font-bold" : "text-xs font-semibold"
                        )}
                    >
                        Worker Test {history ? "Results" : "Matrix"} (
                        {submission.testsPassed}/{submission.totalTests} passed)
                    </span>
                    <div
                        className={
                            history
                                ? "space-y-1.5"
                                : "grid grid-cols-1 gap-2 sm:grid-cols-3"
                        }
                    >
                        {submission.testResults?.map((result, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "min-w-0 space-y-2 rounded border border-border/60 p-2",
                                    history
                                        ? "bg-muted/20"
                                        : "bg-muted/30 text-xs"
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        {result.passed ? (
                                            <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                                        ) : (
                                            <XCircle className="size-3.5 shrink-0 text-destructive" />
                                        )}
                                        <span
                                            className={cn(
                                                "font-medium",
                                                history
                                                    ? "text-foreground"
                                                    : "truncate"
                                            )}
                                        >
                                            {result.name}
                                        </span>
                                    </div>
                                    {history && (
                                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                            {result.passed
                                                ? "PASSED"
                                                : "FAILED"}
                                        </span>
                                    )}
                                </div>
                                {result.error && (
                                    <p className="font-mono text-[11px] break-words whitespace-pre-wrap text-muted-foreground">
                                        {result.error}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {history && (
                <div className="space-y-1.5">
                    <span className="block font-bold text-foreground">
                        Submitted Code:
                    </span>
                    <pre className="max-h-48 overflow-y-auto rounded bg-muted/50 p-2.5 font-mono text-[11px]">
                        {submission.code}
                    </pre>
                </div>
            )}
        </section>
    )
}
