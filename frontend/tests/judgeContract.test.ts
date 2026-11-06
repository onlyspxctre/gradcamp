import test from "node:test"
import assert from "node:assert/strict"
import { parseJudgeResponse } from "../src/services/judgeContract.ts"

const testResult = {
    name: "Test One (12 + 5 = 17)",
    passed: false,
    error: "Expected '17', got '7'",
}

function completed(tests: unknown) {
    return { status: "completed", results: { tests } }
}

test("parses every current job lifecycle state", () => {
    for (const status of ["pending", "inprogress"])
        assert.deepEqual(parseJudgeResponse({ status }), { status })
    assert.deepEqual(parseJudgeResponse({ status: "failed" }), {
        status: "failed",
    })
    assert.deepEqual(
        parseJudgeResponse({ status: "failed", error: "Compilation failed" }),
        { status: "failed", error: "Compilation failed" }
    )
    assert.deepEqual(
        parseJudgeResponse(completed([testResult])),
        completed([testResult])
    )
})

test("preserves diagnostic text and empty success diagnostics without interpreting them", () => {
    const tests = [
        { name: "Passed", passed: true, error: "" },
        { name: "Timed out", passed: false, error: "Time Limit Exceeded" },
        {
            name: "Crashed",
            passed: false,
            error: "Segmentation Fault (SIGSEGV)",
        },
        { name: "Nonzero exit", passed: false, error: "Exited with code 1" },
        { name: "Output limit", passed: false, error: "Output Limit Exceeded" },
        {
            name: "Invalid output",
            passed: false,
            error: "Invalid output: embedded NUL byte",
        },
        {
            name: "Wrong answer",
            passed: false,
            error: "Expected '17', got '<script>bad()</script>'\nDetails remain plain text.",
        },
    ]
    assert.deepEqual(parseJudgeResponse(completed(tests)), completed(tests))
})

test("unknown additive fields do not change or leak into the consumed contract", () => {
    const payload = {
        ...completed([{ ...testResult, extra: "ignored" }]),
        extra: "ignored",
    }
    assert.deepEqual(parseJudgeResponse(payload), completed([testResult]))
})

for (const [label, payload] of [
    ["null", null],
    ["an array", []],
    ["a primitive", "completed"],
    ["a missing status", {}],
    ["an unknown status", { status: "finished" }],
    ["a non-string job error", { status: "failed", error: {} }],
    ["missing results", { status: "completed" }],
    ["null results", { status: "completed", results: null }],
    ["missing tests", { status: "completed", results: {} }],
    ["non-array tests", completed("tests")],
    ["an empty test suite", completed([])],
    ["a null test", completed([null])],
    ["a non-object test", completed(["test"])],
    ["a missing test name", completed([{ passed: false, error: "Failed" }])],
    ["a non-string test name", completed([{ ...testResult, name: 1 }])],
    ["a missing pass flag", completed([{ name: "Test", error: "Failed" }])],
    [
        "a truthy string pass flag",
        completed([{ ...testResult, passed: "false" }]),
    ],
    ["a numeric pass flag", completed([{ ...testResult, passed: 1 }])],
    ["a missing diagnostic", completed([{ name: "Test", passed: true }])],
    ["a null diagnostic", completed([{ ...testResult, error: null }])],
    ["a non-string diagnostic", completed([{ ...testResult, error: {} }])],
    [
        "a partly invalid suite",
        completed([testResult, { ...testResult, error: 42 }]),
    ],
] as const)
    test(`rejects ${label} rather than manufacturing a grading result`, () => {
        assert.equal(parseJudgeResponse(payload), null)
    })
