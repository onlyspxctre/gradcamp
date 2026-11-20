import type { Problem } from "@/types"

const examples: Problem["examples"] = [
    {
        id: 1,
        input: "a = 4, b = 9, c = 2",
        output: "9",
        explanation: "9 is greater than both 4 and 2.",
    },
    {
        id: 2,
        input: "a = -8, b = -3, c = -5",
        output: "-3",
        explanation: "The value closest to zero is the largest here.",
    },
    {
        id: 3,
        input: "a = 7, b = 7, c = 1",
        output: "7",
        explanation: "A tie for largest still returns that value once.",
    },
]

export const LARGEST_OF_THREE: Problem = {
    kind: "code",
    id: "1",
    numericId: 2,
    title: "Largest of Three",
    slug: "largest-of-three",
    difficulty: "Easy",
    category: "Arithmetic & Basics",
    description: `Given three integers \`a\`, \`b\`, and \`c\`, return the largest of the three. The inputs may be negative or equal.

Try starting with one input as your current largest value, then updating it with an \`if\` statement whenever you find a bigger one.`,
    examples,
    constraints: ["-1000 <= a, b, c <= 1000"],
    starterCode: `int max3(int a, int b, int c) {
    // TODO: Return the largest input.
    return 0;
}`,
    testCases: examples.map(({ id, input, output }) => ({
        id: `tc-${id}`,
        name: `Case ${id}`,
        input,
        expectedOutput: output,
    })),
}
