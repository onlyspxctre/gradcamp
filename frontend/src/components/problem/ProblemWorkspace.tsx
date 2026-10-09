import { useState, useEffect, useRef, useCallback } from "react"
import type { Problem, Submission, ProblemLeftTab, ConsoleTab } from "@/types"
import { ProblemLeftPane } from "./ProblemLeftPane"
import { CodeEditorPane } from "./CodeEditorPane"
import { submitToBackendQueue } from "@/services/judgeService"
import { GripVertical } from "lucide-react"

interface ProblemWorkspaceProps {
  problem: Problem
  submissions: Submission[]
  onNewSubmission: (sub: Submission) => void
  isRunning: boolean
  setIsRunning: (running: boolean) => void
  isSubmitting: boolean
  setIsSubmitting: (submitting: boolean) => void
}

export function ProblemWorkspace({
  problem,
  submissions,
  onNewSubmission,
  isRunning,
  setIsRunning,
  isSubmitting,
  setIsSubmitting,
}: ProblemWorkspaceProps) {
  const [code, setCode] = useState<string>(problem.starterCode)

  // Left tab and console state
  const [leftTab, setLeftTab] = useState<ProblemLeftTab>("description")
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase")
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true)
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(
    null
  )
  const [submissionStateDetail, setSubmissionStateDetail] = useState<string>("")

  const [runResult, setRunResult] = useState<{
    passed: boolean
    output?: string
    expected?: string
    caseName: string
  } | null>(null)

  // Split-pane width state (percentage)
  const [splitPercent, setSplitPercent] = useState<number>(45)
  const isDraggingRef = useRef<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset code to starter template
  const handleResetCode = () => {
    setCode(problem.starterCode)
  }

  // Run Code logic (submits to worker and shows in test result tab)
  const handleRunCode = useCallback(async () => {
    if (isRunning || isSubmitting) return

    setIsRunning(true)
    setIsConsoleOpen(true)
    setConsoleTab("testresult")

    try {
      const result = await submitToBackendQueue({
        problemId: problem.id,
        problemTitle: problem.title,
        code,
        onStatusChange: (_status, detail) => {
          if (detail) setSubmissionStateDetail(detail)
        },
      })

      const firstTest = result.testResults?.[0]
      setRunResult({
        passed: firstTest ? firstTest.passed : result.status === "Accepted",
        output: firstTest?.output,
        expected: firstTest?.expected ?? problem.testCases[0].expectedOutput,
        caseName: problem.testCases[0].name,
      })
      setActiveSubmission(result)
      onNewSubmission(result)
    } finally {
      setIsRunning(false)
    }
  }, [isRunning, isSubmitting, problem, code, onNewSubmission, setIsRunning])

  // Submit Code logic (submits to backend worker queue and shows in submission result tab)
  const handleSubmitCode = useCallback(async () => {
    if (isRunning || isSubmitting) return

    setIsSubmitting(true)
    setIsConsoleOpen(true)
    setConsoleTab("submission")
    setActiveSubmission(null)
    setSubmissionStateDetail("Connecting to backend /upload...")

    try {
      const result = await submitToBackendQueue({
        problemId: problem.id,
        problemTitle: problem.title,
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
  }, [isRunning, isSubmitting, problem, code, onNewSubmission, setIsSubmitting])

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
        handleSubmitCode()
      } else if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault()
        handleRunCode()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSubmitCode, handleRunCode])

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
          problem={problem}
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
          problem={problem}
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
          problem={problem}
          code={code}
          setCode={setCode}
          onRunCode={handleRunCode}
          onSubmitCode={handleSubmitCode}
          onResetCode={handleResetCode}
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
