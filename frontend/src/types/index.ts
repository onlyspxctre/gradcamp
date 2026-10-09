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

export interface Problem {
  id: string
  numericId: number
  title: string
  slug: string
  difficulty: Difficulty
  category: string
  tags: string[]
  acceptance: string
  totalSubmissions: string
  description: string
  examples: ProblemExample[]
  constraints: string[]
  hints: string[]
  starterCodes: Record<string, string>
  testCases: TestCase[]
  solutionExplanation?: {
    approach: string
    complexity: {
      time: string
      space: string
    }
    codeSnippet: string
  }
}

export interface SupportedLanguage {
  id: string
  name: string
  monacoLang: string
  extension: string
  version: string
}

export interface TestResultItem {
  name: string
  passed: boolean
  input?: string
  output?: string
  expected?: string
  durationMs?: number
  error?: string
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
  runtimePercentile?: number
  memoryMb?: number
  memoryPercentile?: number
  testsPassed: number
  totalTests: number
  testResults?: TestResultItem[]
  compileError?: string
}

export type ActiveNavTab =
  "problems" | "solve" | "contest" | "discuss" | "submissions" | "queue"

export type ProblemLeftTab =
  "description" | "editorial" | "submissions" | "discuss"

export type ConsoleTab = "testcase" | "testresult" | "submission"
