import { useState, useRef, useEffect, useCallback } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import {
  Play,
  Send,
  RotateCcw,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  GripHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import type { Problem, Submission, ConsoleTab } from "@/types"
import { SubmissionStatusBadge } from "@/components/common/StatusBadges"

interface CodeEditorPaneProps {
  problem: Problem
  code: string
  setCode: (code: string) => void
  onRunCode: () => void
  onSubmitCode: () => void
  onResetCode: () => void
  isRunning: boolean
  isSubmitting: boolean
  activeSubmission: Submission | null
  submissionStateDetail?: string
  runResult: {
    passed: boolean
    output?: string
    expected?: string
    caseName: string
  } | null
  consoleTab: ConsoleTab
  setConsoleTab: (tab: ConsoleTab) => void
  isConsoleOpen: boolean
  setIsConsoleOpen: (open: boolean) => void
}

export function CodeEditorPane({
  problem,
  code,
  setCode,
  onRunCode,
  onSubmitCode,
  onResetCode,
  isRunning,
  isSubmitting,
  activeSubmission,
  submissionStateDetail,
  runResult,
  consoleTab,
  setConsoleTab,
  isConsoleOpen,
  setIsConsoleOpen,
}: CodeEditorPaneProps) {
  const { theme } = useTheme()
  const [fontSize, setFontSize] = useState<number>(14)
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0)
  const [customInput, setCustomInput] = useState<string>("")
  const [isCustomCase, setIsCustomCase] = useState<boolean>(false)

  const [consoleBodyHeight, setConsoleBodyHeight] = useState<number>(180)
  const [isDraggingConsole, setIsDraggingConsole] = useState<boolean>(false)
  const isDraggingConsoleRef = useRef<boolean>(false)
  const startDragYRef = useRef<number>(0)
  const startHeightRef = useRef<number>(180)

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const paneContainerRef = useRef<HTMLDivElement>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1800)
  }

  const currentCase = problem.testCases[selectedCaseIdx] || problem.testCases[0]

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
    requestAnimationFrame(() => {
      editor.layout()
    })
  }

  // Re-layout when console height changes or fullscreen toggles
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout()
    }
  }, [consoleBodyHeight, consoleTab, isFullscreen])

  // Re-layout during and after the 200ms open/close transition
  useEffect(() => {
    if (!editorRef.current) return
    const timer = setTimeout(() => {
      editorRef.current?.layout()
    }, 210)
    return () => clearTimeout(timer)
  }, [isConsoleOpen])

  // ResizeObserver on the container ensures Monaco fills the exact available box
  useEffect(() => {
    if (!editorContainerRef.current) return
    const ro = new ResizeObserver(() => {
      if (editorRef.current) {
        editorRef.current.layout()
      }
    })
    ro.observe(editorContainerRef.current)
    return () => ro.disconnect()
  }, [])

  // Vertical Console Resizer Handlers
  const handleConsoleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingConsoleRef.current = true
    setIsDraggingConsole(true)
    startDragYRef.current = e.clientY
    startHeightRef.current = consoleBodyHeight
    document.body.style.cursor = "row-resize"
    document.body.style.userSelect = "none"
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingConsoleRef.current || !paneContainerRef.current) return
    const deltaY = startDragYRef.current - e.clientY // Dragging UP increases height
    const paneTotalHeight = paneContainerRef.current.clientHeight
    const newHeight = Math.min(
      Math.max(startHeightRef.current + deltaY, 60),
      paneTotalHeight * 0.7
    )
    setConsoleBodyHeight(newHeight)
    requestAnimationFrame(() => {
      editorRef.current?.layout()
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    if (isDraggingConsoleRef.current) {
      isDraggingConsoleRef.current = false
      setIsDraggingConsole(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      requestAnimationFrame(() => {
        editorRef.current?.layout()
      })
    }
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return (
    <div
      ref={paneContainerRef}
      className={`flex h-full w-full flex-col overflow-hidden bg-background ${
        isFullscreen ? "fixed inset-0 z-50" : "relative"
      }`}
    >
      {/* Top Editor Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5 text-xs">
        {/* Language Indicator: C Only */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded bg-primary px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground">
            C
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            GCC / Clang
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1">
          {/* Font size control */}
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="cursor-pointer rounded border border-border/80 bg-transparent px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground focus:outline-none"
            title="Editor Font Size"
          >
            <option value={12}>12px</option>
            <option value={13}>13px</option>
            <option value={14}>14px</option>
            <option value={16}>16px</option>
          </select>

          {/* Reset Code */}
          <Button
            variant="ghost"
            size="xs"
            onClick={onResetCode}
            title="Reset code template"
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          {/* Copy Code */}
          <Button
            variant="ghost"
            size="xs"
            onClick={handleCopy}
            title="Copy code"
            className="text-muted-foreground hover:text-foreground"
          >
            {isCopied ? (
              <Check className="size-3 text-emerald-500" />
            ) : (
              <Copy className="size-3" />
            )}
            <span className="hidden sm:inline">
              {isCopied ? "Copied" : "Copy"}
            </span>
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="text-muted-foreground hover:text-foreground"
          >
            {isFullscreen ? (
              <Minimize2 className="size-3" />
            ) : (
              <Maximize2 className="size-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Monaco Code Editor Area */}
      <div
        ref={editorContainerRef}
        className="relative min-h-[140px] w-full flex-1 overflow-hidden bg-background"
      >
        <div className="absolute inset-0 h-full w-full">
          {/* Prevent Monaco from capturing mouse events while resizing */}
          {isDraggingConsole && (
            <div className="absolute inset-0 z-30 cursor-row-resize" />
          )}
          <Editor
            height="100%"
            width="100%"
            language="c"
            value={code}
            onChange={(val) => setCode(val ?? "")}
            onMount={handleEditorDidMount}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
              fontSize,
              fontFamily:
                "'Geist Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
              fontLigatures: true,
              tabSize: 4,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              lineNumbers: "on",
              folding: true,
              bracketPairColorization: { enabled: true },
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: "all",
              cursorBlinking: "smooth",
              overviewRulerBorder: false,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
            loading={
              <div className="flex h-full w-full items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading Editor...</span>
              </div>
            }
          />
        </div>
      </div>

      {/* Draggable Vertical Handle between Editor and Console */}
      {isConsoleOpen && (
        <div
          onMouseDown={handleConsoleResizeStart}
          className="group flex h-2 w-full cursor-row-resize items-center justify-center border-t border-border/80 bg-muted/40 transition-colors select-none hover:bg-primary/20 active:bg-primary/30"
          title="Drag vertically to resize console"
        >
          <GripHorizontal className="size-3 text-muted-foreground/60 transition-colors group-hover:text-primary" />
        </div>
      )}

      {/* Bottom Console Drawer */}
      <div className="flex shrink-0 flex-col border-t border-border bg-background">
        {/* Console Header Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-muted/20 px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
              className="mr-2 flex items-center gap-1.5 rounded px-2 py-1 font-semibold text-foreground transition-colors hover:bg-muted"
              title={isConsoleOpen ? "Collapse console" : "Expand console"}
            >
              <Terminal className="size-3.5 text-blue-500" />
              <span>Console</span>
              {isConsoleOpen ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronUp className="size-3" />
              )}
            </button>

            {isConsoleOpen && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setConsoleTab("testcase")}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    consoleTab === "testcase"
                      ? "bg-background font-semibold text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  Testcase
                </button>

                <button
                  onClick={() => setConsoleTab("testresult")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                    consoleTab === "testresult"
                      ? "bg-background font-semibold text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>Test Result</span>
                  {runResult && (
                    <span
                      className={`size-1.5 rounded-full ${
                        runResult.passed ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                  )}
                </button>

                <button
                  onClick={() => setConsoleTab("submission")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                    consoleTab === "submission"
                      ? "bg-background font-semibold text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>Submission Result</span>
                  {activeSubmission && (
                    <span
                      className={`size-1.5 rounded-full ${
                        activeSubmission.status === "Accepted"
                          ? "bg-emerald-500"
                          : "bg-rose-500"
                      }`}
                    />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons: Run & Submit */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={onRunCode}
              disabled={isRunning || isSubmitting}
              className="gap-1.5 text-xs font-semibold"
            >
              <Play
                className={`size-3 fill-emerald-500 text-emerald-500 ${
                  isRunning ? "animate-pulse" : ""
                }`}
              />
              <span>{isRunning ? "Running..." : "Run"}</span>
            </Button>

            <Button
              size="xs"
              onClick={onSubmitCode}
              disabled={isRunning || isSubmitting}
              className="gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Send
                className={`size-3 ${isSubmitting ? "animate-bounce" : ""}`}
              />
              <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
            </Button>
          </div>
        </div>

        {/* Collapsible Console Content Body */}
        <div
          style={{ height: isConsoleOpen ? `${consoleBodyHeight}px` : "0px" }}
          className={`overflow-hidden bg-muted/10 ${
            isDraggingConsole
              ? "transition-none select-none"
              : "transition-[height] duration-200 ease-in-out"
          }`}
        >
          <div className="h-full space-y-3 overflow-y-auto p-3.5 text-xs">
            {/* TAB: TESTCASE */}
            {consoleTab === "testcase" && (
              <div className="space-y-3">
                {/* Case Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {problem.testCases.map((tc, idx) => (
                    <button
                      key={tc.id}
                      onClick={() => {
                        setSelectedCaseIdx(idx)
                        setIsCustomCase(false)
                      }}
                      className={`rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                        !isCustomCase && selectedCaseIdx === idx
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {tc.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsCustomCase(true)}
                    className={`rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                      isCustomCase
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    + Custom
                  </button>
                </div>

                {/* Case Input View */}
                {isCustomCase ? (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Custom Input:
                    </span>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="e.g. num1 = 5, num2 = 8"
                      className="h-16 w-full resize-none rounded border border-border bg-background p-2 font-mono text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Input:
                      </span>
                      <pre className="rounded border border-border/70 bg-muted/40 p-2 font-mono text-xs text-foreground">
                        {currentCase.input}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Expected Output:
                      </span>
                      <pre className="rounded border border-border/70 bg-muted/40 p-2 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {currentCase.expectedOutput}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: TEST RESULT */}
            {consoleTab === "testresult" && (
              <div className="space-y-3">
                {isRunning ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Executing test case...</span>
                  </div>
                ) : runResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {runResult.passed ? (
                          <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-4" />
                            <span>Accepted</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                            <XCircle className="size-4" />
                            <span>Wrong Answer</span>
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Case: {runResult.caseName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 font-mono sm:grid-cols-2">
                      <div className="space-y-1">
                        <span className="font-sans text-[11px] font-semibold text-muted-foreground">
                          Output:
                        </span>
                        <pre className="overflow-x-auto rounded border border-border bg-muted/40 p-2 text-foreground">
                          {runResult.output ?? "--"}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <span className="font-sans text-[11px] font-semibold text-muted-foreground">
                          Expected:
                        </span>
                        <pre className="overflow-x-auto rounded border border-border bg-muted/40 p-2 text-emerald-600 dark:text-emerald-400">
                          {runResult.expected ?? "--"}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground">
                    Click "Run" to test your solution.
                  </div>
                )}
              </div>
            )}

            {/* TAB: SUBMISSION RESULT */}
            {consoleTab === "submission" && (
              <div className="space-y-3">
                {isSubmitting ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                    <Loader2 className="size-6 animate-spin text-emerald-500" />
                    <span className="text-sm font-semibold text-foreground">
                      Submitting to Backend Worker
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {submissionStateDetail || "Uploading to /upload..."}
                    </span>
                  </div>
                ) : activeSubmission ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2">
                      <div className="flex items-center gap-2">
                        <SubmissionStatusBadge
                          status={activeSubmission.status}
                          className="px-3 py-1 text-sm"
                        />
                        <span className="font-mono text-xs text-muted-foreground">
                          {activeSubmission.language}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        Job ID: {activeSubmission.id}
                      </span>
                    </div>

                    {activeSubmission.compileError ? (
                      <div className="rounded border border-destructive/20 bg-destructive/10 p-3 font-mono text-xs whitespace-pre-wrap text-destructive">
                        {activeSubmission.compileError}
                      </div>
                    ) : (
                      <>
                        {activeSubmission.testResults &&
                          activeSubmission.testResults.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="block text-xs font-semibold text-foreground">
                                Worker Test Matrix (
                                {activeSubmission.testsPassed}/
                                {activeSubmission.totalTests} passed)
                              </span>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {activeSubmission.testResults.map((t, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 rounded border border-border/60 bg-muted/30 p-2 text-xs"
                                  >
                                    {t.passed ? (
                                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                                    ) : (
                                      <XCircle className="size-3.5 shrink-0 text-rose-500" />
                                    )}
                                    <span className="truncate font-medium">
                                      {t.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground">
                    Click "Submit" to send your solution to the backend
                    autograder worker.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
