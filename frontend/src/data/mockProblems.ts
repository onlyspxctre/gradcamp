import type { Problem } from "@/types"

export const DEMO_PROBLEM: Problem = {
    id: "1",
    numericId: 1,
    title: "Add Two Integers",
    slug: "add-two-integers",
    difficulty: "Easy",
    category: "Arithmetic & Basics",
    description: `Given two integers \`num1\` and \`num2\`, return the sum of the two integers.

Implement the function \`add\` in C.`,
    examples: [
        {
            id: 1,
            input: "num1 = 12, num2 = 5",
            output: "17",
            explanation:
                "num1 is 12, num2 is 5, and their sum is 12 + 5 = 17, so 17 is returned.",
        },
        {
            id: 2,
            input: "num1 = -10, num2 = 4",
            output: "-6",
            explanation: "num1 + num2 = -6, so -6 is returned.",
        },
        {
            id: 3,
            input: "num1 = 0, num2 = 0",
            output: "0",
        },
    ],
    constraints: [
        "-100 <= num1, num2 <= 100",
        "Return value must be a signed 32-bit integer.",
    ],
    starterCode: `int add(int a, int b) {
    // TODO: Return the sum of a and b
    return 0;
}`,
    testCases: [
        {
            id: "tc-1",
            name: "Case 1",
            input: "num1 = 12, num2 = 5",
            expectedOutput: "17",
        },
        {
            id: "tc-2",
            name: "Case 2",
            input: "num1 = -10, num2 = 4",
            expectedOutput: "-6",
        },
        {
            id: "tc-3",
            name: "Case 3",
            input: "num1 = 0, num2 = 0",
            expectedOutput: "0",
        },
    ],
}

export const MOCK_PROBLEMS: Problem[] = [DEMO_PROBLEM]
