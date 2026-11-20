import type { Problem } from "@/types"

const examples: Problem["examples"] = [
    {
        id: 1,
        input: "values = [2, 4, 2, 7, 2], n = 5, target = 2",
        output: "3",
        explanation: "The target appears at indices 0, 2, and 4.",
    },
    {
        id: 2,
        input: "values = [1, 3, 5], n = 3, target = 2",
        output: "0",
        explanation: "None of the elements equals 2.",
    },
    {
        id: 3,
        input: "values = [], n = 0, target = 4",
        output: "0",
        explanation: "An empty array has no elements to check.",
    },
]

export const COUNT_OCCURRENCES: Problem = {
    kind: "code",
    id: "3",
    numericId: 4,
    title: "Count Occurrences",
    slug: "count-occurrences",
    difficulty: "Easy",
    category: "Arrays & Loops",
    description: `Given an array \`values\` with \`n\` elements, return how many elements equal \`target\`. Count every match, and do not modify the array.

Use \`n\` as the loop bound: only indices 0 through n - 1 are valid. If n is 0, there are no elements to read.`,
    examples,
    constraints: ["0 <= n <= 20", "-1000 <= each element and target <= 1000"],
    starterCode: `int count_occurrences(const int values[], int n, int target) {
    // TODO: Count the elements equal to target.
    return 0;
}`,
    testCases: examples.map(({ id, input, output }) => ({
        id: `tc-${id}`,
        name: `Case ${id}`,
        input,
        expectedOutput: output,
    })),
}
