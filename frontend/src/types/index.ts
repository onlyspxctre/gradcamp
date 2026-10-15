export type Difficulty = "Easy" | "Medium" | "Hard"

export type SubmissionStatus =
    | "Accepted"
    | "Wrong Answer"
    | "Time Limit Exceeded"
    | "Memory Limit Exceeded"
    | "Runtime Error"
    | "Compile Error"
    | "Pending"
    | "In Progress"

export interface TestCase {
    id: string
    name: string
    input: string
    expectedOutput: string
}

export interface ProblemExample {
    id: number
    input: string
    output: string
    explanation?: string
}

export interface SupportedLanguage {
    id: string
    name: string
    monacoLang: string
    extension: string
    version: string
}

export interface Problem {
    id: string
    numericId: number
    title: string
    slug: string
    difficulty: Difficulty
    category: string
    description: string
    examples: ProblemExample[]
    constraints: string[]
    starterCode: string
    testCases: TestCase[]
}

export interface TestResultItem {
    name: string
    passed: boolean
    output?: string
    expected?: string
    durationMs?: number
}

export interface Submission {
    id: string
    problemId: string
    problemTitle: string
    language: string
    code: string
    status: SubmissionStatus
    timestamp: string
    runtimeMs?: number
    memoryMb?: number
    testsPassed: number
    totalTests: number
    testResults?: TestResultItem[]
    compileError?: string
    statusDetail?: string
}

export type ActiveNavTab = "workspace" | "assignments" | "submissions"

export type ProblemLeftTab = "description" | "submissions"

export type ConsoleTab = "testcase" | "testresult" | "submission"
