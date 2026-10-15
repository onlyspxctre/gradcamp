import { useState, useEffect, useRef } from "react"
import { ProblemLeftPane } from "./ProblemLeftPane"
import { CodeEditorPane } from "./CodeEditorPane"
import { useWorkspace } from "@/context/WorkspaceContext"
import { GripVertical } from "lucide-react"

export function ProblemWorkspace() {
    const {
        currentProblem,
        code,
        setCode,
        resetCode,
        isRunning,
        isSubmitting,
        submissions,
        activeSubmission,
        setActiveSubmission,
        submissionStateDetail,
        runResult,
        consoleTab,
        setConsoleTab,
        isConsoleOpen,
        setIsConsoleOpen,
        runCode,
        submitCode,
    } = useWorkspace()

    const [leftTab, setLeftTab] = useState<"description" | "submissions">(
        "description"
    )

    // Split-pane width state (percentage)
    const [splitPercent, setSplitPercent] = useState<number>(45)
    const isDraggingRef = useRef<boolean>(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Draggable Divider Mouse Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        isDraggingRef.current = true
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current || !containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const newWidth = ((e.clientX - rect.left) / rect.width) * 100
            if (newWidth >= 25 && newWidth <= 75) {
                setSplitPercent(newWidth)
            }
        }

        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false
                document.body.style.cursor = ""
                document.body.style.userSelect = ""
            }
        }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [])

    // Global keyboard shortcuts (Ctrl+Enter to submit, Ctrl+' to run)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault()
                submitCode()
            } else if ((e.ctrlKey || e.metaKey) && e.key === "'") {
                e.preventDefault()
                runCode()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [submitCode, runCode])

    return (
        <div
            ref={containerRef}
            className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background md:flex-row"
        >
            {/* Left Pane (Description, Submissions) */}
            <div
                style={{ width: `${splitPercent}%` }}
                className="hidden h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden md:flex"
            >
                <ProblemLeftPane
                    problem={currentProblem}
                    submissions={submissions}
                    activeTab={leftTab}
                    setActiveTab={setLeftTab}
                    onSelectSubmission={(sub) => {
                        setActiveSubmission(sub)
                        setConsoleTab("submission")
                        setIsConsoleOpen(true)
                    }}
                />
            </div>

            {/* Draggable Divider (Desktop) */}
            <div
                onMouseDown={handleMouseDown}
                className="group hidden w-2.5 shrink-0 cursor-col-resize items-center justify-center border-x border-border/60 bg-muted/40 transition-colors select-none hover:bg-primary/20 active:bg-primary/30 md:flex"
                title="Drag to resize split panes"
            >
                <GripVertical className="size-3 text-muted-foreground/60 transition-colors group-hover:text-primary" />
            </div>

            {/* Mobile Stack: Show Left pane */}
            <div className="flex h-1/2 min-h-0 flex-1 flex-col overflow-hidden border-b border-border md:hidden">
                <ProblemLeftPane
                    problem={currentProblem}
                    submissions={submissions}
                    activeTab={leftTab}
                    setActiveTab={setLeftTab}
                    onSelectSubmission={(sub) => {
                        setActiveSubmission(sub)
                        setConsoleTab("submission")
                        setIsConsoleOpen(true)
                    }}
                />
            </div>

            {/* Right Pane (Code Editor & Vertically Resizable Test Console) */}
            <div
                style={{ width: `calc(${100 - splitPercent}% - 0.625rem)` }}
                className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            >
                <CodeEditorPane
                    problem={currentProblem}
                    code={code}
                    setCode={setCode}
                    onRunCode={runCode}
                    onSubmitCode={submitCode}
                    onResetCode={resetCode}
                    isRunning={isRunning}
                    isSubmitting={isSubmitting}
                    activeSubmission={activeSubmission}
                    submissionStateDetail={submissionStateDetail}
                    runResult={runResult}
                    consoleTab={consoleTab}
                    setConsoleTab={setConsoleTab}
                    isConsoleOpen={isConsoleOpen}
                    setIsConsoleOpen={setIsConsoleOpen}
                />
            </div>
        </div>
    )
}
