export interface MemoryCell {
    address: number
    label: string
    value: number
}

export const INT_BYTES = 4
export function formatAddress(address: number): string {
    return `0x${address.toString(16).toUpperCase()}`
}
export function makeMemory(
    values: readonly number[],
    base = 0x1000
): MemoryCell[] {
    return values.map((value, index) => ({
        address: base + index * INT_BYTES,
        label: `values[${index}]`,
        value,
    }))
}

export interface LessonFrame {
    activeLine: number
    pointer: number | "null" | null
    values: number[]
    explanation: string
    result?: string
    highlightIndex?: number
}
export interface LessonChapter {
    id: string
    title: string
    summary: string
    takeaway: string
    code: string[]
    frames: LessonFrame[]
}
const VALUES = [8, 21, 34, 55]

export const POINTER_CHAPTERS: LessonChapter[] = [
    {
        id: "addresses",
        title: "Values have addresses",
        summary:
            "A value lives in memory. Its address tells you where that value is stored. The address and the value are different things.",
        takeaway:
            "& means “address of”. &values[1] is an address; values[1] is the integer stored there.",
        code: [
            "int values[4] = {8, 21, 34, 55};",
            "int number = values[1];",
            "// &values[1] is 0x1004 in this model",
        ],
        frames: [
            {
                activeLine: 0,
                pointer: null,
                values: VALUES,
                explanation:
                    "Allocate an array of four integers. In our model, each int occupies four bytes, so consecutive cells start four bytes apart.",
            },
            {
                activeLine: 1,
                pointer: null,
                values: VALUES,
                highlightIndex: 1,
                result: "number = 21",
                explanation:
                    "values[1] reads the second array element. The integer stored at address 0x1004 is 21.",
            },
            {
                activeLine: 2,
                pointer: null,
                values: VALUES,
                highlightIndex: 1,
                result: "&values[1] = 0x1004",
                explanation:
                    "Adding & asks for the element’s address, not its value. Here that address is 0x1004, not 21.",
            },
        ],
    },
    {
        id: "pointer",
        title: "A pointer stores an address",
        summary:
            "An int * can hold the address of an int. Pointing at an element does not copy that element’s value into the pointer.",
        takeaway:
            "In int *p, * declares a pointer type. In the expression *p, it dereferences the pointer.",
        code: [
            "int values[4] = {8, 21, 34, 55};",
            "int *p = &values[1];",
            "// p stores 0x1004, not 21",
        ],
        frames: [
            {
                activeLine: 0,
                pointer: null,
                values: VALUES,
                explanation:
                    "The array is already in memory. We have not declared p yet.",
            },
            {
                activeLine: 1,
                pointer: 1,
                values: VALUES,
                result: "p = 0x1004",
                explanation:
                    "Store the address of values[1] in p. The marker shows which integer p points to.",
            },
            {
                activeLine: 2,
                pointer: 1,
                values: VALUES,
                result: "p → values[1]",
                explanation:
                    "p is a separate variable that stores an address. The table shows the array’s storage, not the storage occupied by p itself.",
            },
        ],
    },
    {
        id: "read",
        title: "Read through a pointer",
        summary:
            "Dereferencing follows a pointer to the object it points at. With a valid int pointer, *p reads the integer at that address.",
        takeaway:
            "Changing p changes where you look. It does not change the integers already in the array.",
        code: [
            "int *p = &values[1];",
            "int first = *p;",
            "p = &values[2];",
            "int second = *p;",
        ],
        frames: [
            {
                activeLine: 0,
                pointer: 1,
                values: VALUES,
                explanation:
                    "Start with p pointing at values[1], at address 0x1004.",
            },
            {
                activeLine: 1,
                pointer: 1,
                values: VALUES,
                result: "first = 21",
                explanation:
                    "*p follows 0x1004 and reads 21. first receives the integer, not an address.",
            },
            {
                activeLine: 2,
                pointer: 2,
                values: VALUES,
                result: "p = 0x1008",
                explanation:
                    "Reassign p to the next element’s address. Watch the marker move; the array values stay the same.",
            },
            {
                activeLine: 3,
                pointer: 2,
                values: VALUES,
                result: "second = 34",
                explanation:
                    "The same expression *p now reads 34, because p points somewhere else.",
            },
        ],
    },
    {
        id: "write",
        title: "Write through a pointer",
        summary:
            "When *p appears on the left of an assignment, it updates the pointed-to object. The pointer’s address stays the same.",
        takeaway:
            "p = ... changes the pointer. *p = ... changes the object it points to.",
        code: ["int *p = &values[1];", "*p = 99;", "int number = values[1];"],
        frames: [
            {
                activeLine: 0,
                pointer: 1,
                values: VALUES,
                explanation:
                    "p stores 0x1004. The integer at that address is currently 21.",
            },
            {
                activeLine: 1,
                pointer: 1,
                values: [8, 99, 34, 55],
                result: "*p = 99",
                explanation:
                    "Write 99 into the element at 0x1004. Only values[1] changes; p still stores the same address.",
            },
            {
                activeLine: 2,
                pointer: 1,
                values: [8, 99, 34, 55],
                result: "number = 99",
                explanation:
                    "Reading values[1] directly sees the same update. The pointer and the array expression refer to the same object.",
            },
        ],
    },
    {
        id: "bounds",
        title: "Step carefully through memory",
        summary:
            "Pointer arithmetic moves in units of the pointed-to type. A pointer must refer to a live, valid object before you dereference it.",
        takeaway:
            "For our four-byte ints, p + 1 advances four bytes. NULL must never be dereferenced; a non-null address alone does not prove a pointer is valid.",
        code: [
            "int *p = values;",
            "p += 2;",
            "p = NULL;",
            "if (p != NULL) {",
            "    int number = *p;",
            "}",
        ],
        frames: [
            {
                activeLine: 0,
                pointer: 0,
                values: VALUES,
                result: "p = 0x1000",
                explanation:
                    "In this initializer, values supplies the address of its first element. p starts at values[0].",
            },
            {
                activeLine: 1,
                pointer: 2,
                values: VALUES,
                result: "p = 0x1008",
                explanation:
                    "p += 2 advances two int elements: 2 × 4 bytes. This is within the same array, so p now points at values[2].",
            },
            {
                activeLine: 2,
                pointer: "null",
                values: VALUES,
                result: "p = NULL",
                explanation:
                    "NULL indicates that p does not point to an object. It is not a cell containing zero, and *p would have undefined behavior.",
            },
            {
                activeLine: 3,
                pointer: "null",
                values: VALUES,
                result: "condition is false → skip the body",
                explanation:
                    "The guard is false, so the read on the next line is not executed. Stay within valid array elements when reading; even a legal one-past-the-end pointer cannot be dereferenced.",
            },
        ],
    },
]

export interface QuizResponse {
    cellIndex?: number
    value?: string
    choice?: string
}
interface QuestionBase {
    id: string
    title: string
    prompt: string
    code: string[]
    concept: string
    explanation: string
    hint?: string
    chapterId: string
    illustration?: {
        cells: MemoryCell[]
        pointer: number | "null"
        after?: { cells: MemoryCell[]; pointer: number | "null" }
    }
}
interface MemoryQuestion extends QuestionBase {
    kind: "memory"
    cells: MemoryCell[]
    targetIndex: number
    answer: number
    valueLabel: string
}
interface ChoiceQuestion extends QuestionBase {
    kind: "choice"
    choices: { id: string; label: string }[]
    answer: string
}
interface ValueQuestion extends QuestionBase {
    kind: "value"
    answer: number
    valueLabel: string
    cells: MemoryCell[]
    pointerIndex: number
}
export type PointerQuestion = MemoryQuestion | ChoiceQuestion | ValueQuestion

export const POINTER_QUESTIONS: PointerQuestion[] = [
    {
        id: "follow-address",
        kind: "memory",
        title: "Follow the address",
        concept: "Dereferencing",
        prompt: "p stores 0x1008. Move the pointer to the matching memory cell, then enter the value of *p.",
        code: [
            "int values[4] = {10, 25, 42, -7};",
            "int *p = &values[2];",
            "int result = *p;",
        ],
        cells: makeMemory([10, 25, 42, -7]),
        targetIndex: 2,
        answer: 42,
        valueLabel: "Value of *p",
        chapterId: "read",
        explanation:
            "p holds 0x1008, the address of values[2]. Dereferencing reads the value stored there: 42. The address itself is not the answer.",
    },
    {
        id: "address-or-value",
        kind: "choice",
        title: "Address or value?",
        concept: "Pointer expressions",
        prompt: "n is stored at 0x2000, and p itself is stored at 0x3000. Which expression evaluates to 0x2000?",
        code: ["int n = 18;", "int *p = &n;"],
        choices: [
            { id: "deref", label: "*p" },
            { id: "pointer", label: "p" },
            { id: "pointer-address", label: "&p" },
            { id: "number", label: "n" },
        ],
        answer: "pointer",
        hint: "p holds an address, *p reads the pointed-to integer, and &p asks where the pointer variable itself is stored.",
        chapterId: "pointer",
        explanation:
            "p stores the address of n, so p evaluates to 0x2000. *p and n evaluate to 18. &p is the pointer variable’s own address, 0x3000.",
    },
    {
        id: "write-through",
        kind: "value",
        title: "Update the pointed-to value",
        concept: "Writing through pointers",
        prompt: "Execute the assignment on line 3. What is values[1] afterward? Enter the integer; the memory model updates when you submit.",
        code: [
            "int values[4] = {3, 7, 11, 15};",
            "int *p = &values[1];",
            "*p = 23;",
        ],
        cells: makeMemory([3, 7, 11, 15]),
        pointerIndex: 1,
        answer: 23,
        valueLabel: "Final value of values[1]",
        chapterId: "write",
        explanation:
            "*p = 23 writes 23 into values[1]. It does not change the address stored in p, and the other array elements are unchanged.",
    },
    {
        id: "move-then-write",
        kind: "choice",
        title: "Move, then write",
        concept: "Reassignment vs. dereferencing",
        prompt: "After all four lines run, which pair of values is correct?",
        code: ["int a = 4, b = 9;", "int *p = &a;", "p = &b;", "*p = *p + 3;"],
        choices: [
            { id: "change-a", label: "a = 7, b = 9" },
            { id: "change-b", label: "a = 4, b = 12" },
            { id: "change-both", label: "a = 7, b = 12" },
            { id: "unchanged", label: "a = 4, b = 9" },
        ],
        answer: "change-b",
        hint: "Changing p redirects it without changing either integer. Check which object p points to before the final line runs.",
        illustration: {
            cells: [
                { address: 0x2000, label: "a", value: 4 },
                { address: 0x2004, label: "b", value: 9 },
            ],
            pointer: 0,
            after: {
                cells: [
                    { address: 0x2000, label: "a", value: 4 },
                    { address: 0x2004, label: "b", value: 12 },
                ],
                pointer: 1,
            },
        },
        chapterId: "write",
        explanation:
            "p = &b redirects the pointer without changing a or b. The final assignment then reads b through *p, adds 3, and writes 12 back into b. a stays 4.",
    },
    {
        id: "array-step",
        kind: "memory",
        title: "Step through an array",
        concept: "Pointer arithmetic",
        prompt: "The array starts at 0x4000. Move p to its position after p += 2, then enter *(p - 1). Remember that this read is one element BEFORE p.",
        code: [
            "int values[4] = {5, 10, 15, 20};",
            "int *p = values;",
            "p += 2;",
            "int result = *(p - 1);",
        ],
        cells: makeMemory([5, 10, 15, 20], 0x4000),
        targetIndex: 2,
        answer: 10,
        valueLabel: "Value of *(p - 1)",
        chapterId: "bounds",
        explanation:
            "p advances by two int elements to 0x4008 (values[2]), not by two bytes. p - 1 points at values[1], so *(p - 1) reads 10. This expression does not move p itself.",
    },
    {
        id: "null-guard",
        kind: "choice",
        title: "Avoid an invalid read",
        concept: "Null pointers",
        prompt: "p is NULL. Which code avoids dereferencing it in this example?",
        code: ["int *p = NULL;"],
        choices: [
            { id: "read-zero", label: "int n = *p; // NULL reads as 0" },
            { id: "guard", label: "if (p != NULL) { int n = *p; }" },
            { id: "move", label: "p++; int n = *p;" },
            { id: "address-check", label: "if (&p != NULL) { int n = *p; }" },
        ],
        answer: "guard",
        hint: "NULL does not point to an integer. The guard must test p itself, not the address of the pointer variable (&p).",
        chapterId: "bounds",
        explanation:
            "p != NULL is false, so the guarded read is skipped. NULL does not contain an integer, and incrementing a null pointer is not valid pointer arithmetic. &p refers to p’s own storage, so that check does not make *p safe. In general, a non-null pointer must still refer to a valid live object.",
    },
]

export function gradePointerAnswer(
    question: PointerQuestion,
    response: QuizResponse
): { correct: boolean; feedback: string } {
    if (question.kind === "choice") {
        if (!response.choice)
            return {
                correct: false,
                feedback: "Select an answer before submitting.",
            }
        const correct = response.choice === question.answer
        return {
            correct,
            feedback: correct
                ? question.explanation
                : (question.hint ??
                  "Trace which object p points to at each line, then try again."),
        }
    }
    // Do not accept blank/partial numbers, exponent notation, or addresses as integers.
    const value = response.value?.trim() ?? ""
    if (!/^-?\d+$/.test(value))
        return {
            correct: false,
            feedback: "Enter a whole-number value, not a memory address.",
        }
    const numberCorrect = Number(value) === question.answer
    const locationCorrect =
        question.kind !== "memory" ||
        response.cellIndex === question.targetIndex
    const correct = numberCorrect && locationCorrect
    let feedback = question.explanation
    if (!correct)
        feedback = !locationCorrect
            ? "The pointer is on the wrong cell. Match the stored address, counting in four-byte int elements, then check the value you read."
            : "The pointer location is correct, but the integer is not. Check whether the expression reads *p, writes through p, or reads a neighboring element."
    if (question.kind === "value" && !correct)
        feedback =
            "That is not the final value. An assignment to *p changes the pointed-to element, not p’s address. Try tracing line 3 again."
    return { correct, feedback }
}
