import React, { createContext, useContext, useState, useCallback } from "react"
import type { Problem, Submission, ConsoleTab } from "@/types"
import { submitToBackendQueue } from "@/services/judgeService"
import { MOCK_PROBLEMS } from "@/data/mockProblems"

export interface RunResult {
    passed: boolean
    output?: string
    expected?: string
    caseName: string
}

interface WorkspaceContextType {
    currentProblem: Problem
    setCurrentProblem: (problem: Problem) => void
    code: string
    setCode: (code: string) => void
    resetCode: () => void

    isRunning: boolean
    isSubmitting: boolean
    submissionStateDetail: string

    submissions: Submission[]
    activeSubmission: Submission | null
    setActiveSubmission: (sub: Submission | null) => void

    runResult: RunResult | null
    setRunResult: React.Dispatch<React.SetStateAction<RunResult | null>>

    consoleTab: ConsoleTab
    setConsoleTab: (tab: ConsoleTab) => void
    isConsoleOpen: boolean
    setIsConsoleOpen: React.Dispatch<React.SetStateAction<boolean>>

    runCode: () => Promise<void>
    submitCode: () => Promise<void>
    onNewSubmission: (sub: Submission) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [currentProblem, setCurrentProblem] = useState<Problem>(
        MOCK_PROBLEMS[0]
    )

    // Preserve editor code per problem across tab switches and problem changes
    const [codeCache, setCodeCache] = useState<Record<string, string>>({
        [MOCK_PROBLEMS[0].id]: MOCK_PROBLEMS[0].starterCode,
    })

    const code = codeCache[currentProblem.id] ?? currentProblem.starterCode

    const setCode = useCallback(
        (newCode: string) => {
            setCodeCache((prev) => ({
                ...prev,
                [currentProblem.id]: newCode,
            }))
        },
        [currentProblem.id]
    )

    const resetCode = useCallback(() => {
        setCode(currentProblem.starterCode)
    }, [currentProblem.starterCode, setCode])

    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [submissionStateDetail, setSubmissionStateDetail] =
        useState<string>("")

    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [activeSubmission, setActiveSubmission] = useState<Submission | null>(
        null
    )
    const [runResult, setRunResult] = useState<RunResult | null>(null)

    const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase")
    const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true)

    const onNewSubmission = useCallback((sub: Submission) => {
        setSubmissions((prev) => [sub, ...prev])
    }, [])

    const runCode = useCallback(async () => {
        if (isRunning || isSubmitting) return

        setIsRunning(true)
        setIsConsoleOpen(true)
        setConsoleTab("testresult")

        try {
            const result = await submitToBackendQueue({
                problemId: currentProblem.id,
                problemTitle: currentProblem.title,
                code,
                onStatusChange: (_status, detail) => {
                    if (detail) setSubmissionStateDetail(detail)
                },
            })

            const firstTest = result.testResults?.[0]
            setRunResult({
                passed: firstTest
                    ? firstTest.passed
                    : result.status === "Accepted",
                output: firstTest?.output,
                expected:
                    firstTest?.expected ??
                    currentProblem.testCases[0]?.expectedOutput,
                caseName: currentProblem.testCases[0]?.name ?? "Case 1",
            })
            setActiveSubmission(result)
            onNewSubmission(result)
        } finally {
            setIsRunning(false)
        }
    }, [isRunning, isSubmitting, currentProblem, code, onNewSubmission])

    const submitCode = useCallback(async () => {
        if (isRunning || isSubmitting) return

        setIsSubmitting(true)
        setIsConsoleOpen(true)
        setConsoleTab("submission")
        setActiveSubmission(null)
        setSubmissionStateDetail("Connecting to backend /upload...")

        try {
            const result = await submitToBackendQueue({
                problemId: currentProblem.id,
                problemTitle: currentProblem.title,
                code,
                onStatusChange: (_status, detail) => {
                    if (detail) setSubmissionStateDetail(detail)
                },
            })

            setActiveSubmission(result)
            onNewSubmission(result)
        } finally {
            setIsSubmitting(false)
        }
    }, [isRunning, isSubmitting, currentProblem, code, onNewSubmission])

    return (
        <WorkspaceContext.Provider
            value={{
                currentProblem,
                setCurrentProblem,
                code,
                setCode,
                resetCode,
                isRunning,
                isSubmitting,
                submissionStateDetail,
                submissions,
                activeSubmission,
                setActiveSubmission,
                runResult,
                setRunResult,
                consoleTab,
                setConsoleTab,
                isConsoleOpen,
                setIsConsoleOpen,
                runCode,
                submitCode,
                onNewSubmission,
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    )
}

export function useWorkspace(): WorkspaceContextType {
    const context = useContext(WorkspaceContext)
    if (!context) {
        throw new Error("useWorkspace must be used within a WorkspaceProvider")
    }
    return context
}
