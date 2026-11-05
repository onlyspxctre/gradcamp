import React, { createContext, useContext, useState, useCallback } from "react"
import type { Problem, Submission, ConsoleTab } from "@/types"
import { submitToBackendQueue } from "@/services/judgeService"
import { MOCK_PROBLEMS } from "@/data/mockProblems"

interface WorkspaceContextType {
    currentProblem: Problem
    setCurrentProblem: (problem: Problem) => void
    code: string
    setCode: (code: string) => void
    resetCode: () => void

    isSubmitting: boolean
    submissionStateDetail: string

    submissions: Submission[]
    activeSubmission: Submission | null
    setActiveSubmission: (sub: Submission | null) => void

    consoleTab: ConsoleTab
    setConsoleTab: (tab: ConsoleTab) => void
    isConsoleOpen: boolean
    setIsConsoleOpen: React.Dispatch<React.SetStateAction<boolean>>

    submitCode: () => Promise<void>
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

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [submissionStateDetail, setSubmissionStateDetail] =
        useState<string>("")

    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [activeSubmission, setActiveSubmission] = useState<Submission | null>(
        null
    )

    const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase")
    const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true)

    const submitCode = useCallback(async () => {
        if (isSubmitting) return

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
            setSubmissions((prev) => [result, ...prev])
        } finally {
            setIsSubmitting(false)
        }
    }, [isSubmitting, currentProblem, code])

    return (
        <WorkspaceContext.Provider
            value={{
                currentProblem,
                setCurrentProblem,
                code,
                setCode,
                resetCode,
                isSubmitting,
                submissionStateDetail,
                submissions,
                activeSubmission,
                setActiveSubmission,
                consoleTab,
                setConsoleTab,
                isConsoleOpen,
                setIsConsoleOpen,
                submitCode,
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
