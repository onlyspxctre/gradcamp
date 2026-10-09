import React, { useState, useEffect, useRef, useCallback } from "react"
import type {
  Problem,
  SupportedLanguage,
  Submission,
  ProblemLeftTab,
  ConsoleTab,
} from "@/types"
import { SUPPORTED_LANGUAGES } from "@/data/languages"
import { ProblemLeftPane } from "./ProblemLeftPane"
import { CodeEditorPane } from "./CodeEditorPane"
import { submitToJudge, runLocalTestCase } from "@/services/judgeService"
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
  // Languages & Code state
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    SUPPORTED_LANGUAGES[0] // C as default
  )

  // Store code per language for this problem
  const [codeMap, setCodeMap] = useState<Record<string, string>>({})

  const currentCode =
    codeMap[selectedLanguage.id] ??
    problem.starterCodes[selectedLanguage.id] ??
    "// Write your solution here\n"

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
    output: string
    expected: string
    durationMs: number
    caseName: string
  } | null>(null)

  // Split-pane width state (percentage)
  const [splitPercent, setSplitPercent] = useState<number>(45)
  const isDraggingRef = useRef<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update current code
  const handleCodeChange = (newCode: string) => {
    setCodeMap((prev) => ({
      ...prev,
      [selectedLanguage.id]: newCode,
    }))
  }

  // Reset code to starter template
  const handleResetCode = () => {
    const starter =
      problem.starterCodes[selectedLanguage.id] || "// Start typing...\n"
    handleCodeChange(starter)
  }

  // Run Code logic
  const handleRunCode = useCallback(async () => {
    if (isRunning || isSubmitting) return

    setIsRunning(true)
    setIsConsoleOpen(true)
    setConsoleTab("testresult")

    try {
      const activeCase = problem.testCases[0]
      const res = await runLocalTestCase(
        currentCode,
        activeCase.input,
        activeCase.expectedOutput
      )

      setRunResult({
        passed: res.passed,
        output: res.output,
        expected: activeCase.expectedOutput,
        durationMs: res.durationMs,
        caseName: activeCase.name,
      })
    } finally {
      setIsRunning(false)
    }
  }, [isRunning, isSubmitting, problem, currentCode, setIsRunning])

  // Submit Code logic
  const handleSubmitCode = useCallback(async () => {
    if (isRunning || isSubmitting) return

    setIsSubmitting(true)
    setIsConsoleOpen(true)
    setConsoleTab("submission")
    setActiveSubmission(null)
    setSubmissionStateDetail("Submitting to Gradcamp worker queue...")

    try {
      const result = await submitToJudge({
        problemId: problem.id,
        problemTitle: problem.title,
        code: currentCode,
        language: selectedLanguage.name,
        onStatusChange: (_status, detail) => {
          if (detail) setSubmissionStateDetail(detail)
        },
      })

      setActiveSubmission(result)
      onNewSubmission(result)
      // Switch left tab to submissions so user sees update there too if desired
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isRunning,
    isSubmitting,
    problem,
    currentCode,
    selectedLanguage.name,
    onNewSubmission,
    setIsSubmitting,
  ])

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
      {/* Left Pane (Description, Editorial, Submissions, Solutions) */}
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

      {/* Mobile Stack: Show Left pane when needed or collapsed */}
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

      {/* Right Pane (Code Editor & Test Console) */}
      <div
        style={{ width: `calc(${100 - splitPercent}% - 0.625rem)` }}
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <CodeEditorPane
          problem={problem}
          code={currentCode}
          setCode={handleCodeChange}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
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
