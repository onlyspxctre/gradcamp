import type { Problem } from "@/types"

const examples: Problem["examples"] = [
    {
        id: 1,
        input: "n = 7",
        output: "1",
        explanation: "7 has one decimal digit.",
    },
    {
        id: 2,
        input: "n = 1000",
        output: "4",
        explanation: "Count all four digits, including the three zeros.",
    },
    {
        id: 3,
        input: "n = 0",
        output: "1",
        explanation: "The decimal representation of zero is one digit.",
    },
]

export const COUNT_DIGITS: Problem = {
    kind: "code",
    id: "2",
    numericId: 3,
    title: "Count Digits",
    slug: "count-digits",
    difficulty: "Easy",
    category: "Loops & Arithmetic",
    description: `Given a nonnegative integer \`n\`, return the number of digits in its decimal representation. Zero has one digit.

Try a loop that divides by 10. In C, integer division discards the remainder: for example, 205 / 10 is 20.`,
    examples,
    constraints: ["0 <= n <= 1,000,000,000"],
    starterCode: `int count_digits(int n) {
    // TODO: Count the decimal digits in n.
    return 0;
}`,
    testCases: examples.map(({ id, input, output }) => ({
        id: `tc-${id}`,
        name: `Case ${id}`,
        input,
        expectedOutput: output,
    })),
}
