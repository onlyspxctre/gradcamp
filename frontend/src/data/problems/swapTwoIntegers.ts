import type { Problem } from "@/types"

const examples: Problem["examples"] = [
    {
        id: 1,
        input: "x = 3, y = 8",
        output: "8 3",
        explanation: "After swap(&x, &y), x holds 8 and y holds 3.",
    },
    {
        id: 2,
        input: "x = -5, y = 0",
        output: "0 -5",
    },
    {
        id: 3,
        input: "x = 4, y = 4",
        output: "4 4",
        explanation: "Swapping equal values leaves both variables unchanged.",
    },
]

export const SWAP_TWO_INTEGERS: Problem = {
    kind: "code",
    id: "4",
    numericId: 7,
    title: "Swap Two Integers",
    slug: "swap-two-integers",
    difficulty: "Easy",
    category: "Pointers & Memory",
    description: `Implement \`swap\` so that it exchanges the values of the two integers that \`a\` and \`b\` point to. For example, the caller can use \`swap(&x, &y)\` to exchange the values stored in \`x\` and \`y\`.

The function returns nothing. Write through the pointers to update the caller's variables; changing the local pointer parameters doesn't change those variables. The test driver prints \`x\` and \`y\` after your function returns, so your function should not print anything.

Hint: Save one of the original integers in a temporary variable before you overwrite it. This exercise builds on the Pointers: memory lab quiz.`,
    examples,
    constraints: [
        "a and b point to two distinct, valid int objects.",
        "-1000 <= each input value <= 1000",
    ],
    starterCode: `void swap(int *a, int *b) {
    // TODO: Swap the integers that a and b point to.
}`,
    testCases: examples.map(({ id, input, output }) => ({
        id: `tc-${id}`,
        name: `Case ${id}`,
        input,
        expectedOutput: output,
    })),
}
