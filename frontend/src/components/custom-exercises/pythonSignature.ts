import type { ExampleCase } from "./customExercises"

export const PYTHON_TYPES = {
    int: "Integer (int)",
    float: "Float (float)",
    number: "Number (int or float)",
    str: "String (str)",
    bool: "Boolean (bool)",
    list: "List (list)",
    dict: "Object (dict)",
    none: "None (null)",
} as const

export type PythonType = keyof typeof PYTHON_TYPES

export interface PythonSignature {
    arguments: PythonType[]
    returns: PythonType
}

export const MAX_ARGUMENTS = 12

function isPythonType(value: unknown): value is PythonType {
    return typeof value === "string" && Object.hasOwn(PYTHON_TYPES, value)
}

export function isPythonSignature(value: unknown): value is PythonSignature {
    if (!value || typeof value !== "object") return false
    const signature = value as Record<string, unknown>
    return (
        Array.isArray(signature.arguments) &&
        signature.arguments.length <= MAX_ARGUMENTS &&
        signature.arguments.every(isPythonType) &&
        isPythonType(signature.returns)
    )
}

function parseCaseJson(text: string): unknown {
    return JSON.parse(text, (_key, value) => {
        if (typeof value === "number" && !Number.isFinite(value)) {
            throw new Error("Expected a finite JSON number")
        }
        return value
    })
}

function matchesType(value: unknown, type: PythonType): boolean {
    switch (type) {
        case "int":
            return typeof value === "number" && Number.isSafeInteger(value)
        case "float":
        case "number":
            return typeof value === "number"
        case "str":
            return typeof value === "string"
        case "bool":
            return typeof value === "boolean"
        case "list":
            return Array.isArray(value)
        case "dict":
            return (
                value !== null &&
                typeof value === "object" &&
                !Array.isArray(value)
            )
        case "none":
            return value === null
    }
}

export function validateFunctionCase(
    testCase: ExampleCase,
    signature: PythonSignature
): string | null {
    let args: unknown
    try {
        args = parseCaseJson(testCase.input)
    } catch {
        return "Arguments must be a valid JSON array, such as [2, 3]."
    }
    if (!Array.isArray(args))
        return "Arguments must be a JSON array, such as [2, 3]."
    if (args.length !== signature.arguments.length) {
        return `Expected ${signature.arguments.length} argument(s), got ${args.length}.`
    }
    for (const [index, type] of signature.arguments.entries()) {
        if (!matchesType(args[index], type)) {
            return `Argument ${index + 1} must be ${PYTHON_TYPES[type]}.`
        }
    }
    let expected: unknown
    try {
        expected = parseCaseJson(testCase.expectedOutput)
    } catch {
        return 'Enter a JSON return value, such as 5, "hello", or null.'
    }
    return !matchesType(expected, signature.returns)
        ? `Expected return must be ${PYTHON_TYPES[signature.returns]}.`
        : null
}

export function describeSignature(name: string, signature: PythonSignature) {
    const format = (type: PythonType) =>
        type === "number" ? "int | float" : type === "none" ? "None" : type
    const params = signature.arguments.map(
        (type, index) => `arg${index + 1}: ${format(type)}`
    )
    return `${name}(${params.join(", ")}) -> ${format(signature.returns)}`
}
