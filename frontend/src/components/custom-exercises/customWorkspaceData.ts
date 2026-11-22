import type { Problem, TestResultItem } from "@/types"
import type { CustomExercise } from "./customExercises"
import type { PythonResult } from "./pythonRunner"
import { describeSignature } from "./pythonSignature"

export function customProblem(
    exercise: CustomExercise,
    numericId: number
): Problem {
    const signature = describeSignature(
        exercise.functionName,
        exercise.signature
    )
    const examples = exercise.cases.map(({ input, expectedOutput }, index) => ({
        id: index + 1,
        input,
        output: expectedOutput,
    }))
    return {
        kind: "code",
        id: `custom-${exercise.id}`,
        slug: `custom-${exercise.id}`,
        numericId,
        title: exercise.title,
        difficulty: "Easy",
        category: "Custom · Python",
        description: `${exercise.prompt}\n\nImplement \`${signature}\` and return the answer. The grader calls it with the arguments listed in each case. Printing is not required and does not count as returning an answer.`,
        constraints: [
            "Return a JSON-compatible value. The cases pass arguments positionally.",
            "Argument and return types must match the signature.",
        ],
        starterCode: exercise.starterCode,
        examples,
        testCases: examples.map(({ id, input, output }) => ({
            id: `tc-${id}`,
            name: `Case ${id}`,
            input,
            expectedOutput: output,
        })),
    }
}

export function pythonTestResults(
    exercise: CustomExercise,
    results: PythonResult[]
): TestResultItem[] {
    return results.map((result, index) => {
        const expected = exercise.cases[index].expectedOutput
        const passed =
            !result.error && !result.returnTypeError && result.matchesReturn
        const actual = result.returned ?? "(no return value)"
        const details = [
            result.error,
            result.returnTypeError,
            `Expected return: ${expected}`,
            `Actual return: ${actual}`,
            result.stdout ? `Printed output: ${result.stdout}` : "",
        ]
        return {
            name: `Case ${index + 1}`,
            passed,
            error: passed ? "" : details.filter(Boolean).join("\n"),
        }
    })
}
