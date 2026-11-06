import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useReducer,
} from "react"
import type { Assignment, Submission, ConsoleTab } from "@/types"
import { submitToBackendQueue } from "@/services/judgeService"
import { MOCK_PROBLEMS } from "@/data/mockProblems"
import {
    getActiveCode,
    getActiveSubmission,
    initialWorkspaceState,
    workspaceReducer,
} from "@/lib/workspaceState"

interface WorkspaceContextType {
    activeAssignment: Assignment
    selectAssignment: (assignment: Assignment) => void
    code: string
    setCode: (code: string) => void
    resetCode: () => void

    isSubmitting: boolean
    submissionStateDetail: string

    submissions: Submission[]
    activeSubmission: Submission | null
    selectSubmission: (id: string) => void

    consoleTab: ConsoleTab
    setConsoleTab: (tab: ConsoleTab) => void
    isConsoleOpen: boolean
    setIsConsoleOpen: React.Dispatch<React.SetStateAction<boolean>>

    submitCode: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(
        workspaceReducer,
        MOCK_PROBLEMS[0],
        initialWorkspaceState
    )
    const { activeAssignment, submissions } = state
    const code = getActiveCode(state)
    const activeSubmission = getActiveSubmission(state)

    const selectAssignment = useCallback((assignment: Assignment) => {
        dispatch({ type: "select-assignment", assignment })
    }, [])
    const selectSubmission = useCallback((id: string) => {
        dispatch({ type: "select-submission", id })
    }, [])
    const setCode = useCallback((code: string) => {
        dispatch({ type: "edit-code", code })
    }, [])
    const resetCode = useCallback(() => {
        dispatch({ type: "reset-code" })
    }, [])

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [submissionStateDetail, setSubmissionStateDetail] =
        useState<string>("")

    const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase")
    const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true)

    const submitCode = useCallback(async () => {
        if (isSubmitting || activeAssignment.kind !== "code") return

        setIsSubmitting(true)
        setIsConsoleOpen(true)
        setConsoleTab("submission")
        dispatch({ type: "submission-started" })
        setSubmissionStateDetail("Connecting to backend /upload...")

        try {
            const result = await submitToBackendQueue({
                problemId: activeAssignment.id,
                problemTitle: activeAssignment.title,
                code,
                onStatusChange: (_status, detail) => {
                    if (detail) setSubmissionStateDetail(detail)
                },
            })

            dispatch({ type: "submission-completed", submission: result })
        } finally {
            setIsSubmitting(false)
        }
    }, [isSubmitting, activeAssignment, code])

    return (
        <WorkspaceContext.Provider
            value={{
                activeAssignment,
                selectAssignment,
                code,
                setCode,
                resetCode,
                isSubmitting,
                submissionStateDetail,
                submissions,
                activeSubmission,
                selectSubmission,
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
