// Wire format currently produced by /fetch and the evaluator. Keep lifecycle
// status separate from the frontend's existing submission verdict labels.
export interface JudgeTestResult {
    name: string
    passed: boolean
    error: string
}

export type JudgeResponse =
    | { status: "pending" | "inprogress" }
    | { status: "completed"; results: { tests: JudgeTestResult[] } }
    | { status: "failed"; error?: string }

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseJudgeResponse(value: unknown): JudgeResponse | null {
    if (!isRecord(value)) return null

    switch (value.status) {
        case "pending":
        case "inprogress":
            return { status: value.status }
        case "failed":
            if (value.error !== undefined && typeof value.error !== "string")
                return null
            return value.error === undefined
                ? { status: "failed" }
                : { status: "failed", error: value.error }
        case "completed": {
            if (
                !isRecord(value.results) ||
                !Array.isArray(value.results.tests) ||
                value.results.tests.length === 0
            )
                return null

            const tests: JudgeTestResult[] = []
            for (const test of value.results.tests) {
                if (
                    !isRecord(test) ||
                    typeof test.name !== "string" ||
                    typeof test.passed !== "boolean" ||
                    typeof test.error !== "string"
                )
                    return null
                tests.push({
                    name: test.name,
                    passed: test.passed,
                    error: test.error,
                })
            }
            return { status: "completed", results: { tests } }
        }
        default:
            return null
    }
}
