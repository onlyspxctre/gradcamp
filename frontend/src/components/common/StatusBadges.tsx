import type { Difficulty, SubmissionStatus } from "@/types"
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Loader2,
} from "lucide-react"

export function DifficultyBadge({
    difficulty,
    className = "",
}: {
    difficulty: Difficulty
    className?: string
}) {
    const styles: Record<Difficulty, string> = {
        Easy: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        Medium: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
        Hard: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
    }

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[difficulty]} ${className}`}
        >
            {difficulty}
        </span>
    )
}

export function SubmissionStatusBadge({
    status,
    className = "",
}: {
    status: SubmissionStatus
    className?: string
}) {
    switch (status) {
        case "Accepted":
            return (
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 ${className}`}
                >
                    <CheckCircle2 className="size-3.5" />
                    Accepted
                </span>
            )
        case "Wrong Answer":
            return (
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 ${className}`}
                >
                    <XCircle className="size-3.5" />
                    Wrong Answer
                </span>
            )
        case "Time Limit Exceeded":
        case "Memory Limit Exceeded":
            return (
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400 ${className}`}
                >
                    <Clock className="size-3.5" />
                    {status}
                </span>
            )
        case "Compile Error":
        case "Runtime Error":
            return (
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400 ${className}`}
                >
                    <AlertTriangle className="size-3.5" />
                    {status}
                </span>
            )
        case "Pending":
        case "In Progress":
            return (
                <span
                    className={`inline-flex animate-pulse items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 ${className}`}
                >
                    <Loader2 className="size-3.5 animate-spin" />
                    {status}
                </span>
            )
    }
}
