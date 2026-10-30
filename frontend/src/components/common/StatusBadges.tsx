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
        Easy: "text-success bg-success/8",
        Medium: "text-warning bg-warning/8",
        Hard: "text-destructive bg-destructive/8",
    }
    return (
        <span
            className={`inline-flex items-center rounded-sm px-2 py-1 text-[10px] font-medium ${styles[difficulty]} ${className}`}
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
    const isPending = status === "Pending" || status === "In Progress"
    const isLimit =
        status === "Time Limit Exceeded" || status === "Memory Limit Exceeded"
    const isError = status === "Compile Error" || status === "Runtime Error"
    const Icon =
        status === "Accepted"
            ? CheckCircle2
            : isPending
              ? Loader2
              : isLimit
                ? Clock
                : isError
                  ? AlertTriangle
                  : XCircle
    const style =
        status === "Accepted"
            ? "bg-success/8 text-success"
            : isPending
              ? "bg-primary/8 text-primary"
              : isLimit
                ? "bg-warning/8 text-warning"
                : "bg-destructive/8 text-destructive"
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-medium ${style} ${className}`}
        >
            <Icon className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
            {status}
        </span>
    )
}
