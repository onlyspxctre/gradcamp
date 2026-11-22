import test from "node:test"
import assert from "node:assert/strict"
import { validateFunctionCase } from "../src/components/custom-exercises/pythonSignature.ts"

test("function cases require an argument array and valid JSON return value", () => {
    assert.equal(
        validateFunctionCase(
            { input: "[[1, 2], null]", expectedOutput: '"ok"' },
            { arguments: ["list", "none"], returns: "str" }
        ),
        null
    )
    const check = (input: string, expectedOutput: string) =>
        validateFunctionCase(
            { input, expectedOutput },
            { arguments: [], returns: "none" }
        )
    assert.equal(check("[]", "null"), null)
    assert.match(check("1", "null") ?? "", /JSON array/)
    assert.match(check("[1,]", "null") ?? "", /JSON array/)
    assert.match(check("[1e999]", "null") ?? "", /JSON array/)
    assert.match(check("[]", "None") ?? "", /JSON return value/)
})

test("typed cases validate arity and reject coercion across JSON types", () => {
    const signature = {
        arguments: ["int", "str", "bool", "list", "dict"],
        returns: "int",
    } as const
    const check = (input: string, expectedOutput = "5") =>
        validateFunctionCase(
            { input, expectedOutput },
            { ...signature, arguments: [...signature.arguments] }
        )
    const valid = '[2.0, "hi", false, [1, 2], {"key": "value"}]'
    assert.equal(check(valid), null)
    assert.match(check("[]") ?? "", /Expected 5 argument/)
    assert.match(check(valid.replace("2.0", "true")) ?? "", /Argument 1/)
    assert.match(check(valid.replace("2.0", "2.5")) ?? "", /Argument 1/)
    assert.match(check(valid.replace('"hi"', "2")) ?? "", /Argument 2/)
    assert.match(check(valid, '"5"') ?? "", /Expected return/)
    assert.match(check(valid, "true") ?? "", /Expected return/)
    assert.match(check(valid, "9007199254740992") ?? "", /Expected return/)
})
