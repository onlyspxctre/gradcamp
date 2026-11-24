import test from "node:test"
import assert from "node:assert/strict"
import { submitToBackendQueue } from "../src/services/judgeService.ts"

async function submitWithPollResponses(...bodies: string[]) {
    const problemId = "42"
    const originalFetch = globalThis.fetch
    let uploads = 0
    globalThis.fetch = async (input, options) => {
        if (String(input).startsWith("/upload?job=")) {
            uploads++
            const url = new URL(String(input), "http://localhost")
            assert.equal(url.searchParams.get("question"), problemId)
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
            problemId,
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

test("passes AbortSignal to /upload and /fetch and continues polling after a transient /fetch error", async () => {
    const originalFetch = globalThis.fetch
    let uploadSignal: AbortSignal | null | undefined
    const fetchSignals: Array<AbortSignal | null | undefined> = []
    let pollCount = 0

    globalThis.fetch = async (input, options) => {
        if (String(input).startsWith("/upload?job=")) {
            uploadSignal = options?.signal
            return new Response("Uploaded")
        }
        fetchSignals.push(options?.signal)
        pollCount++
        if (pollCount === 1) {
            throw new DOMException("The operation timed out.", "TimeoutError")
        }
        return new Response(
            JSON.stringify({
                status: "completed",
                results: {
                    tests: [{ name: "Test One", passed: true, error: "" }],
                },
            }),
            { headers: { "Content-Type": "application/json" } }
        )
    }

    try {
        const result = await submitToBackendQueue({
            problemId: "42",
            problemTitle: "Add Two Integers",
            code: "int add(int a, int b) { return a + b; }",
        })
        assert.ok(uploadSignal instanceof AbortSignal)
        assert.equal(fetchSignals.length, 2)
        assert.ok(fetchSignals[0] instanceof AbortSignal)
        assert.ok(fetchSignals[1] instanceof AbortSignal)
        assert.equal(result.status, "Accepted")
    } finally {
        globalThis.fetch = originalFetch
    }
})

test("returns Status Unknown when polling expires while backend is still pending", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input) => {
        if (String(input).startsWith("/upload?job=")) {
            return new Response("Uploaded")
        }
        return new Response(JSON.stringify({ status: "pending" }), {
            headers: { "Content-Type": "application/json" },
        })
    }

    try {
        const result = await submitToBackendQueue({
            problemId: "42",
            problemTitle: "Add Two Integers",
            code: "int add(int a, int b) { return a + b; }",
            maxPolls: 2,
        })
        assert.equal(result.status, "Status Unknown")
        assert.match(
            result.compileError ?? "",
            /Stopped waiting after polling window expired .* last status: pending/
        )
    } finally {
        globalThis.fetch = originalFetch
    }
})

test("returns Status Unknown with poll-failure message when /fetch requests keep aborting", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input) => {
        if (String(input).startsWith("/upload?job=")) {
            return new Response("Uploaded")
        }
        throw new DOMException("The operation timed out.", "TimeoutError")
    }

    try {
        const result = await submitToBackendQueue({
            problemId: "42",
            problemTitle: "Add Two Integers",
            code: "int add(int a, int b) { return a + b; }",
            maxPolls: 2,
        })
        assert.equal(result.status, "Status Unknown")
        assert.equal(
            result.compileError,
            "Unable to poll backend (/fetch) for grading status: HTTP requests timed out or failed."
        )
    } finally {
        globalThis.fetch = originalFetch
    }
})

test("reports upload timeout distinctly from connection failure", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
        throw new DOMException("The operation timed out.", "TimeoutError")
    }

    try {
        const result = await submitToBackendQueue({
            problemId: "42",
            problemTitle: "Add Two Integers",
            code: "int add(int a, int b) { return a + b; }",
        })
        assert.equal(result.status, "Runtime Error")
        assert.equal(
            result.compileError,
            "Upload to backend (/upload) timed out after 10s."
        )
    } finally {
        globalThis.fetch = originalFetch
    }
})
