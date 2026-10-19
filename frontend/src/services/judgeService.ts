import type { Submission, SubmissionStatus, TestResultItem } from "@/types"

function generateJobId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID().replace(/-/g, "").substring(0, 16)
    }
    return "job" + Math.random().toString(36).substring(2, 14)
}

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

    onStatusChange?.("Pending", `Uploading source to /upload?job=${jobId}...`)

    try {
        const uploadRes = await fetch(`/upload?job=${jobId}`, {
            method: "POST",
            body: code,
            headers: {
                "Content-Type": "text/plain",
            },
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
        const maxPolls = 50
        for (let i = 0; i < maxPolls; i++) {
            await new Promise((r) => setTimeout(r, 100))

            const fetchRes = await fetch(`/fetch?job=${jobId}`)
            if (!fetchRes.ok) {
                continue
            }

            const data = await fetchRes.json().catch(() => null)
            if (!data) continue

            if (data.status === "completed") {
                const tests: TestResultItem[] = (data.results?.tests || []).map(
                    (t: {
                        name: string
                        passed: boolean
                        output?: string
                        expected?: string
                    }) => ({
                        name: t.name,
                        passed: t.passed,
                        output: t.output,
                        expected: t.expected,
                    })
                )
                const passedCount = tests.filter((t) => t.passed).length
                const allPassed =
                    tests.length > 0 && passedCount === tests.length

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
