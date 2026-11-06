import test from "node:test"
import assert from "node:assert/strict"
import { submitToBackendQueue } from "../src/services/judgeService.ts"

async function submitWithPollResponses(...bodies: string[]) {
    const originalFetch = globalThis.fetch
    let uploads = 0
    globalThis.fetch = async (input, options) => {
        if (String(input).startsWith("/upload?job=")) {
            uploads++
            assert.equal(options?.method, "POST")
            assert.equal(
                options?.body,
                "int add(int a, int b) { return a + b; }"
            )
            return new Response("Uploaded")
        }
        assert.match(String(input), /^\/fetch\?job=/)
        const body = bodies.shift()
        assert.notEqual(body, undefined, "unexpected extra poll")
        return new Response(body, {
            headers: { "Content-Type": "application/json" },
        })
    }
    try {
        const result = await submitToBackendQueue({
            problemId: "1",
            problemTitle: "Add Two Integers",
            code: "int add(int a, int b) { return a + b; }",
        })
        assert.equal(uploads, 1)
        assert.equal(bodies.length, 0)
        return result
    } finally {
        globalThis.fetch = originalFetch
    }
}

test("consumes pending/inprogress/completed responses and retains evaluator results in history data", async () => {
    const tests = [
        { name: "Test One (12 + 5 = 17)", passed: true, error: "" },
        {
            name: "Test Two (-10 + 4 = -6)",
            passed: false,
            error: "Expected '-6', got '-14'",
        },
        {
            name: "Test Three (0 + 0 = 0)",
            passed: false,
            error: "Segmentation Fault (SIGSEGV)",
        },
    ]
    const result = await submitWithPollResponses(
        JSON.stringify({ status: "pending" }),
        JSON.stringify({ status: "inprogress" }),
        JSON.stringify({ status: "completed", results: { tests } })
    )
    assert.deepEqual(result.testResults, tests)
    assert.equal(result.testsPassed, 1)
    assert.equal(result.totalTests, 3)
    assert.equal(result.status, "Wrong Answer")
})

test("all-passed evaluator results retain empty diagnostics and remain accepted", async () => {
    const tests = [{ name: "Test One (12 + 5 = 17)", passed: true, error: "" }]
    const result = await submitWithPollResponses(
        JSON.stringify({ status: "completed", results: { tests } })
    )
    assert.equal(result.status, "Accepted")
    assert.deepEqual(result.testResults, tests)
})

test("diagnostic text is not used to invent a machine-readable verdict", async () => {
    const tests = [
        { name: "Test", passed: false, error: "Time Limit Exceeded" },
    ]
    const result = await submitWithPollResponses(
        JSON.stringify({ status: "completed", results: { tests } })
    )
    // Verdict classification is unchanged until the backend exposes typed verdicts.
    assert.equal(result.status, "Wrong Answer")
    assert.deepEqual(result.testResults, tests)
})

test("job-level diagnostics are retained and absent diagnostics use the existing fallback", async () => {
    const failed = await submitWithPollResponses(
        JSON.stringify({ status: "failed", error: "Compilation failed" })
    )
    assert.equal(failed.compileError, "Compilation failed")
    const missingError = await submitWithPollResponses(
        JSON.stringify({ status: "failed" })
    )
    assert.equal(
        missingError.compileError,
        "Worker compilation/execution failure"
    )
})

for (const body of [
    "not JSON",
    "null",
    JSON.stringify({ status: "unknown" }),
    JSON.stringify({ status: "completed", results: { tests: [] } }),
    JSON.stringify({
        status: "completed",
        results: {
            tests: [{ name: "Test", passed: "false", error: "Failed" }],
        },
    }),
])
    test(`invalid payload ${body} produces a protocol error, not a fabricated verdict`, async () => {
        const result = await submitWithPollResponses(body)
        assert.equal(result.status, "Runtime Error")
        assert.equal(
            result.compileError,
            "Invalid grading response from backend (/fetch)."
        )
        assert.equal(result.testResults, undefined)
        assert.equal(result.totalTests, 0)
    })
