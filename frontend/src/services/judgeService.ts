import type { Submission, SubmissionStatus } from "@/types"
import { parseJudgeResponse } from "./judgeContract"

function localSubmissionId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return `local-${crypto.randomUUID()}`
    }
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const OBSERVATION_BUDGET_MS = 75_000
const UPLOAD_TIMEOUT_MS = 10_000
const FETCH_TIMEOUT_MS = 5_000
const BACKOFF_MS = [250, 500, 750] as const
const STEADY_POLL_MS = 800

export interface SubmitOptions {
    problemId: string
    problemTitle: string
    code: string
    onStatusChange?: (status: SubmissionStatus, detail?: string) => void
    observationBudgetMs?: number
}

export async function submitToBackendQueue(
    options: SubmitOptions
): Promise<Submission> {
    const {
        problemId,
        problemTitle,
        code,
        onStatusChange,
        observationBudgetMs = OBSERVATION_BUDGET_MS,
    } = options
    const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })

    const uploadQuery = new URLSearchParams({
        question: problemId,
    })
    const uploadUrl = `/upload?${uploadQuery}`
    onStatusChange?.("Pending", `Uploading source to ${uploadUrl}...`)

    try {
        const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            body: code,
            headers: {
                "Content-Type": "text/plain",
            },
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
        })

        const uploadText = (await uploadRes.text().catch(() => "")).trim()

        if (!uploadRes.ok) {
            return {
                id: localSubmissionId(),
                problemId,
                problemTitle,
                language: "C",
                code,
                status: "Runtime Error",
                timestamp,
                testsPassed: 0,
                totalTests: 0,
                compileError: `Backend HTTP ${uploadRes.status}: ${uploadText || "Upload failed"}`,
            }
        }

        const jobId = uploadText
        if (!jobId) {
            return {
                id: localSubmissionId(),
                problemId,
                problemTitle,
                language: "C",
                code,
                status: "Runtime Error",
                timestamp,
                testsPassed: 0,
                totalTests: 0,
                compileError: "Backend (/upload) returned an empty job ID.",
            }
        }

        onStatusChange?.(
            "In Progress",
            "Queued in Redis (jobs_pending). Waiting for worker..."
        )

        // Poll /fetch?job= within a monotonic wall-clock observation budget
        const pollStart = performance.now()
        const deadline = pollStart + observationBudgetMs
        const budgetSec = Math.round(observationBudgetMs / 1000)
        let lastSeenStatus: "pending" | "inprogress" | null = null
        let hadFetchFailure = false

        for (let i = 0; ; i++) {
            const remainingBeforeSleep = deadline - performance.now()
            if (remainingBeforeSleep <= 0) break

            const delayMs = Math.min(
                BACKOFF_MS[i] ?? STEADY_POLL_MS,
                remainingBeforeSleep
            )
            await new Promise((r) => setTimeout(r, delayMs))

            const remainingBeforeFetch = deadline - performance.now()
            if (remainingBeforeFetch <= 0) break

            let fetchRes: Response
            try {
                fetchRes = await fetch(`/fetch?job=${jobId}`, {
                    signal: AbortSignal.timeout(
                        Math.min(FETCH_TIMEOUT_MS, remainingBeforeFetch)
                    ),
                })
            } catch {
                hadFetchFailure = true
                continue
            }
            if (!fetchRes.ok) {
                hadFetchFailure = true
                continue
            }

            const payload: unknown = await fetchRes.json().catch(() => null)
            const data = parseJudgeResponse(payload)
            if (!data) {
                return {
                    id: jobId,
                    problemId,
                    problemTitle,
                    language: "C",
                    code,
                    status: "Runtime Error",
                    timestamp,
                    testsPassed: 0,
                    totalTests: 0,
                    compileError:
                        "Invalid grading response from backend (/fetch).",
                }
            }
            hadFetchFailure = false

            if (data.status === "completed") {
                const tests = data.results.tests
                const passedCount = tests.filter((test) => test.passed).length
                const allPassed = passedCount === tests.length

                return {
                    id: jobId,
                    problemId,
                    problemTitle,
                    language: "C",
                    code,
                    status: allPassed ? "Accepted" : "Wrong Answer",
                    timestamp,
                    testsPassed: passedCount,
                    totalTests: tests.length,
                    testResults: tests,
                }
            } else if (data.status === "failed") {
                return {
                    id: jobId,
                    problemId,
                    problemTitle,
                    language: "C",
                    code,
                    status: "Compile Error",
                    timestamp,
                    testsPassed: 0,
                    totalTests: 0,
                    compileError:
                        data.error || "Worker compilation/execution failure",
                }
            } else {
                lastSeenStatus = data.status
                const elapsedSec = Math.floor(
                    (performance.now() - pollStart) / 1000
                )
                onStatusChange?.(
                    "In Progress",
                    `Worker status: ${data.status} (${elapsedSec}s / ${budgetSec}s)...`
                )
            }
        }

        const timeoutMessage =
            hadFetchFailure || lastSeenStatus === null
                ? "Unable to poll backend (/fetch) for grading status: HTTP requests timed out or failed."
                : `Stopped waiting after ${budgetSec}s (job ${jobId}, last status: ${lastSeenStatus}). The submission may still finish on the backend.`

        return {
            id: jobId,
            problemId,
            problemTitle,
            language: "C",
            code,
            status: "Status Unknown",
            timestamp,
            testsPassed: 0,
            totalTests: 0,
            compileError: timeoutMessage,
        }
    } catch (err: unknown) {
        const isTimeout = err instanceof Error && err.name === "TimeoutError"
        const message = err instanceof Error ? err.message : String(err)
        return {
            id: localSubmissionId(),
            problemId,
            problemTitle,
            language: "C",
            code,
            status: "Runtime Error",
            timestamp,
            testsPassed: 0,
            totalTests: 0,
            compileError: isTimeout
                ? `Upload to backend (/upload) timed out after ${UPLOAD_TIMEOUT_MS / 1000}s.`
                : `Could not connect to backend service (/upload): ${message}.\nEnsure backend HTTP server is running on port 3000.`,
        }
    }
}
