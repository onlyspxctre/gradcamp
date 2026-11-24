import type { Submission, SubmissionStatus } from "@/types"
import { parseJudgeResponse } from "./judgeContract"

function generateJobId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID().replace(/-/g, "").substring(0, 16)
    }
    return "job" + Math.random().toString(36).substring(2, 14)
}

const UPLOAD_TIMEOUT_MS = 10_000
const FETCH_TIMEOUT_MS = 5_000

export interface SubmitOptions {
    problemId: string
    problemTitle: string
    code: string
    onStatusChange?: (status: SubmissionStatus, detail?: string) => void
}

export async function submitToBackendQueue(
    options: SubmitOptions
): Promise<Submission> {
    const { problemId, problemTitle, code, onStatusChange } = options
    const jobId = generateJobId()
    const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })

    const uploadQuery = new URLSearchParams({
        job: jobId,
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

        if (!uploadRes.ok) {
            const errText = await uploadRes.text().catch(() => "Upload failed")
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
                compileError: `Backend HTTP ${uploadRes.status}: ${errText}`,
            }
        }

        onStatusChange?.(
            "In Progress",
            "Queued in Redis (jobs_pending). Waiting for worker..."
        )

        // Poll /fetch?job=
        const maxPolls = 75
        for (let i = 0; i < maxPolls; i++) {
            let timeout = 800
            switch (i) {
                case 0:
                    timeout = 250;
                    break;
                case 1:
                    timeout = 500;
                    break;
                case 2:
                    timeout = 750;
                    break;
            }
            await new Promise((r) => setTimeout(r, timeout))

            let fetchRes: Response
            try {
                fetchRes = await fetch(`/fetch?job=${jobId}`, {
                    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                })
            } catch {
                continue
            }
            if (!fetchRes.ok) {
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
                onStatusChange?.(
                    "In Progress",
                    `Worker status: ${data.status} (polling ${i + 1}/${maxPolls})...`
                )
            }
        }

        return {
            id: jobId,
            problemId,
            problemTitle,
            language: "C",
            code,
            status: "Time Limit Exceeded",
            timestamp,
            testsPassed: 0,
            totalTests: 0,
            compileError: "Job polling timed out waiting for worker queue",
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
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
            compileError: `Could not connect to backend service (/upload): ${message}.\nEnsure backend HTTP server is running on port 3000.`,
        }
    }
}
