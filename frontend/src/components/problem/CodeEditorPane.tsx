import {
    useState,
    useRef,
    useEffect,
    useCallback,
    type CSSProperties,
} from "react"
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
import { configureEditorThemes } from "@/lib/editorThemes"
import { usePaneResize } from "@/hooks/usePaneResize"
import type {
    Problem,
    Submission,
    ConsoleTab,
    SupportedLanguage,
} from "@/types"
import { SubmissionStatusBadge } from "@/components/common/StatusBadges"
import { SUPPORTED_LANGUAGES } from "@/data/languages"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"

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
    const { resolvedTheme } = useTheme()
    const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
        SUPPORTED_LANGUAGES[0]
    )
    const [fontSize, setFontSize] = useState<number>(14)
    const [isCopied, setIsCopied] = useState<boolean>(false)
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
    const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0)
    const [customInput, setCustomInput] = useState<string>("")
    const [isCustomCase, setIsCustomCase] = useState<boolean>(false)

    const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
    const editorContainerRef = useRef<HTMLDivElement>(null)
    const paneContainerRef = useRef<HTMLDivElement>(null)
    const consoleBodyRef = useRef<HTMLDivElement>(null)
    const lastEditorSizeRef = useRef({ width: 0, height: 0 })

    const applyConsoleHeight = useCallback((value: number) => {
        paneContainerRef.current?.style.setProperty(
            "--console-height",
            `${value}px`
        )
    }, [])
    const getConsoleBounds = useCallback(
        () => ({
            min: 60,
            // Keep the editor usable and all console actions inside the pane.
            max: Math.max(
                60,
                (consoleBodyRef.current?.clientHeight ?? 180) +
                    (editorContainerRef.current?.clientHeight ?? 140) -
                    140
            ),
            unitsPerPixel: -1,
        }),
        []
    )
    const {
        value: consoleBodyHeight,
        setValue: setConsoleBodyHeight,
        separatorProps: consoleSeparatorProps,
    } = usePaneResize({
        axis: "y",
        initialValue: 180,
        getBounds: getConsoleBounds,
        applyValue: applyConsoleHeight,
    })

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 1800)
    }

    const currentCase =
        problem.testCases[selectedCaseIdx] || problem.testCases[0]

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor
        const container = editorContainerRef.current
        if (!container) return
        const size = {
            width: container.clientWidth,
            height: container.clientHeight,
        }
        lastEditorSizeRef.current = size
        editor.layout(size)
    }

    // One layout owner: observe the actual editor box and pass known dimensions.
    // No per-move effects, timers, extra animation frames, or Monaco auto-layout.
    useEffect(() => {
        const container = editorContainerRef.current
        if (!container) return
        const observer = new ResizeObserver(([entry]) => {
            if (!editorRef.current) return
            const size = {
                width: Math.floor(entry.contentRect.width),
                height: Math.floor(entry.contentRect.height),
            }
            const previous = lastEditorSizeRef.current
            if (
                size.width <= 0 ||
                size.height <= 0 ||
                (size.width === previous.width &&
                    size.height === previous.height)
            )
                return
            lastEditorSizeRef.current = size
            editorRef.current.layout(size)
        })
        observer.observe(container)
        return () => observer.disconnect()
    }, [])

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    ref={paneContainerRef}
                    style={
                        {
                            "--console-height": `${consoleBodyHeight}px`,
                        } as CSSProperties
                    }
                    className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-card ${
                        isFullscreen ? "fixed inset-0 z-50" : "relative"
                    }`}
                >
                    {/* Top Editor Toolbar */}
                    <div className="pane-toolbar flex-wrap gap-y-1 px-3 py-1.5">
                        {/* Language Selector */}
                        <div className="flex items-center gap-2">
                            <Select
                                value={selectedLanguage.id}
                                onValueChange={(val) => {
                                    const lang = SUPPORTED_LANGUAGES.find(
                                        (l) => l.id === val
                                    )
                                    if (lang) setSelectedLanguage(lang)
                                }}
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="h-7 min-w-[112px] border-transparent bg-transparent font-medium shadow-none"
                                    aria-label="Programming language"
                                >
                                    <SelectValue placeholder="Select Language" />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                        <SelectItem
                                            key={lang.id}
                                            value={lang.id}
                                        >
                                            {lang.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                                {selectedLanguage.version}
                            </span>
                        </div>

                        {/* Toolbar Controls */}
                        <div className="flex items-center gap-0.5">
                            {/* Font size control */}
                            <Select
                                value={fontSize.toString()}
                                onValueChange={(val) =>
                                    setFontSize(Number(val))
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="h-7 w-[64px] border-transparent bg-transparent font-medium shadow-none"
                                    aria-label="Editor font size"
                                    title="Editor Font Size"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="12">12px</SelectItem>
                                    <SelectItem value="13">13px</SelectItem>
                                    <SelectItem value="14">14px</SelectItem>
                                    <SelectItem value="16">16px</SelectItem>
                                </SelectContent>
                            </Select>

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
                                    <Check className="size-3 text-success" />
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
                                title={
                                    isFullscreen
                                        ? "Exit Fullscreen"
                                        : "Fullscreen"
                                }
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
                        className="relative min-h-[140px] w-full flex-1 overflow-hidden bg-[var(--editor-background)]"
                    >
                        <div className="absolute inset-0 h-full w-full">
                            <Editor
                                height="100%"
                                width="100%"
                                language={selectedLanguage.monacoLang}
                                value={code}
                                onChange={(val) => setCode(val ?? "")}
                                onMount={handleEditorDidMount}
                                beforeMount={configureEditorThemes}
                                theme={`gradcamp-${resolvedTheme}`}
                                options={{
                                    fontSize,
                                    fontFamily:
                                        "'Geist Mono Variable', Menlo, Monaco, monospace",
                                    fontLigatures: true,
                                    tabSize: 4,
                                    minimap: { enabled: false },
                                    automaticLayout: false,
                                    scrollBeyondLastLine: false,
                                    wordWrap: "on",
                                    lineNumbers: "on",
                                    folding: true,
                                    bracketPairColorization: { enabled: true },
                                    padding: { top: 22, bottom: 16 },
                                    lineHeight: 25,
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
                            {...consoleSeparatorProps}
                            className="group flex h-2 w-full shrink-0 cursor-row-resize touch-none items-center justify-center border-t border-border/80 bg-muted/20 transition-colors select-none hover:bg-primary/15 active:bg-primary/20"
                            role="separator"
                            aria-label="Resize editor and console panes"
                            aria-orientation="horizontal"
                            aria-valuemin={60}
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (
                                    event.key === "ArrowUp" ||
                                    event.key === "ArrowDown"
                                ) {
                                    event.preventDefault()
                                    setConsoleBodyHeight(
                                        consoleBodyHeight +
                                            (event.key === "ArrowUp" ? 20 : -20)
                                    )
                                }
                            }}
                            title="Drag or use arrow keys to resize console"
                        >
                            <GripHorizontal className="size-3 text-muted-foreground/60 transition-colors group-hover:text-primary" />
                        </div>
                    )}

                    {/* Bottom Console Drawer */}
                    <div className="flex shrink-0 flex-col border-t border-border bg-card">
                        {/* Console Header Bar */}
                        <div className="flex min-h-11 shrink-0 items-center overflow-x-auto border-b border-border/80 px-3 py-1.5 text-[11px]">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() =>
                                        setIsConsoleOpen(!isConsoleOpen)
                                    }
                                    className="mr-2 flex items-center gap-1.5 rounded px-2 py-1 font-semibold text-foreground transition-colors hover:bg-muted"
                                    title={
                                        isConsoleOpen
                                            ? "Collapse console"
                                            : "Expand console"
                                    }
                                >
                                    <Terminal className="size-3.5 text-primary" />
                                    <span className="hidden lg:inline">
                                        Console
                                    </span>
                                    {isConsoleOpen ? (
                                        <ChevronDown className="size-3" />
                                    ) : (
                                        <ChevronUp className="size-3" />
                                    )}
                                </button>

                                {isConsoleOpen && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() =>
                                                setConsoleTab("testcase")
                                            }
                                            className={`rounded-md px-2.5 py-1 transition-colors ${
                                                consoleTab === "testcase"
                                                    ? "bg-background font-semibold text-foreground shadow-xs"
                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            }`}
                                        >
                                            Test cases
                                        </button>

                                        <button
                                            onClick={() =>
                                                setConsoleTab("testresult")
                                            }
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
                                                        runResult.passed
                                                            ? "bg-success"
                                                            : "bg-destructive"
                                                    }`}
                                                />
                                            )}
                                        </button>

                                        <button
                                            onClick={() =>
                                                setConsoleTab("submission")
                                            }
                                            className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                                                consoleTab === "submission"
                                                    ? "bg-background font-semibold text-foreground shadow-xs"
                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            }`}
                                        >
                                            <span>Submission</span>
                                            {activeSubmission && (
                                                <span
                                                    className={`size-1.5 rounded-full ${
                                                        activeSubmission.status ===
                                                        "Accepted"
                                                            ? "bg-success"
                                                            : "bg-destructive"
                                                    }`}
                                                />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Collapsible Console Content Body */}
                        <div
                            ref={consoleBodyRef}
                            style={{
                                height: isConsoleOpen
                                    ? "var(--console-height)"
                                    : "0px",
                            }}
                            className="console-body overflow-hidden bg-muted/10 transition-[height] duration-200 ease-in-out"
                        >
                            <div className="h-full space-y-3 overflow-y-auto p-3.5 text-xs">
                                {/* TAB: TESTCASE */}
                                {consoleTab === "testcase" && (
                                    <div className="space-y-3">
                                        {/* Case Tabs */}
                                        <div className="flex items-center gap-1.5 overflow-x-auto">
                                            {problem.testCases.map(
                                                (tc, idx) => (
                                                    <button
                                                        key={tc.id}
                                                        onClick={() => {
                                                            setSelectedCaseIdx(
                                                                idx
                                                            )
                                                            setIsCustomCase(
                                                                false
                                                            )
                                                        }}
                                                        className={`rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                                                            !isCustomCase &&
                                                            selectedCaseIdx ===
                                                                idx
                                                                ? "bg-primary font-semibold text-primary-foreground"
                                                                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        }`}
                                                    >
                                                        {tc.name}
                                                    </button>
                                                )
                                            )}
                                            <button
                                                onClick={() =>
                                                    setIsCustomCase(true)
                                                }
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
                                                    onChange={(e) =>
                                                        setCustomInput(
                                                            e.target.value
                                                        )
                                                    }
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
                                                    <pre className="rounded border border-border/70 bg-muted/40 p-2 font-mono text-xs font-medium text-success">
                                                        {
                                                            currentCase.expectedOutput
                                                        }
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
                                                <span>
                                                    Executing test case...
                                                </span>
                                            </div>
                                        ) : runResult ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {runResult.passed ? (
                                                            <div className="flex items-center gap-1.5 font-medium text-success">
                                                                <CheckCircle2 className="size-4" />
                                                                <span>
                                                                    Accepted
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 font-medium text-destructive">
                                                                <XCircle className="size-4" />
                                                                <span>
                                                                    Wrong Answer
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-[11px] text-muted-foreground">
                                                        Case:{" "}
                                                        {runResult.caseName}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 gap-2 font-mono sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <span className="font-sans text-[11px] font-semibold text-muted-foreground">
                                                            Output:
                                                        </span>
                                                        <pre className="overflow-x-auto rounded border border-border bg-muted/40 p-2 text-foreground">
                                                            {runResult.output ??
                                                                "--"}
                                                        </pre>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="font-sans text-[11px] font-semibold text-muted-foreground">
                                                            Expected:
                                                        </span>
                                                        <pre className="overflow-x-auto rounded border border-border bg-muted/40 p-2 text-success">
                                                            {runResult.expected ??
                                                                "--"}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-4 text-center text-muted-foreground">
                                                Click "Run" to test your
                                                solution.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB: SUBMISSION RESULT */}
                                {consoleTab === "submission" && (
                                    <div className="space-y-3">
                                        {isSubmitting ? (
                                            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                                                <Loader2 className="size-6 animate-spin text-primary" />
                                                <span className="text-sm font-semibold text-foreground">
                                                    Submitting to Backend Worker
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {submissionStateDetail ||
                                                        "Uploading to /upload..."}
                                                </span>
                                            </div>
                                        ) : activeSubmission ? (
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <SubmissionStatusBadge
                                                            status={
                                                                activeSubmission.status
                                                            }
                                                            className="px-3 py-1 text-sm"
                                                        />
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {
                                                                activeSubmission.language
                                                            }
                                                        </span>
                                                    </div>
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        Job ID:{" "}
                                                        {activeSubmission.id}
                                                    </span>
                                                </div>

                                                {activeSubmission.compileError ? (
                                                    <div className="rounded border border-destructive/20 bg-destructive/10 p-3 font-mono text-xs whitespace-pre-wrap text-destructive">
                                                        {
                                                            activeSubmission.compileError
                                                        }
                                                    </div>
                                                ) : (
                                                    <>
                                                        {activeSubmission.testResults &&
                                                            activeSubmission
                                                                .testResults
                                                                .length > 0 && (
                                                                <div className="space-y-1.5 pt-1">
                                                                    <span className="block text-xs font-semibold text-foreground">
                                                                        Worker
                                                                        Test
                                                                        Matrix (
                                                                        {
                                                                            activeSubmission.testsPassed
                                                                        }
                                                                        /
                                                                        {
                                                                            activeSubmission.totalTests
                                                                        }{" "}
                                                                        passed)
                                                                    </span>
                                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                                        {activeSubmission.testResults.map(
                                                                            (
                                                                                t,
                                                                                idx
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    className="flex items-center gap-2 rounded border border-border/60 bg-muted/30 p-2 text-xs"
                                                                                >
                                                                                    {t.passed ? (
                                                                                        <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                                                                                    ) : (
                                                                                        <XCircle className="size-3.5 shrink-0 text-destructive" />
                                                                                    )}
                                                                                    <span className="truncate font-medium">
                                                                                        {
                                                                                            t.name
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="py-4 text-center text-muted-foreground">
                                                Submit your solution to check it
                                                against the test cases.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
                        <span className="font-mono text-[10px] text-muted-foreground">
                            {selectedLanguage.name}{" "}
                            <span className="mx-1 opacity-50">/</span>{" "}
                            {code.split("\n").length} lines
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={onRunCode}
                                disabled={isRunning || isSubmitting}
                                className="gap-2 text-xs"
                            >
                                <Play
                                    className={`size-3 text-primary ${isRunning ? "animate-pulse" : ""}`}
                                />
                                {isRunning ? "Running…" : "Run code"}
                            </Button>
                            <Button
                                onClick={onSubmitCode}
                                disabled={isRunning || isSubmitting}
                                className="gap-2 px-4 text-xs"
                            >
                                <Send className="size-3" />
                                {isSubmitting ? "Submitting…" : "Submit"}
                            </Button>
                        </div>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 text-xs">
                <ContextMenuItem
                    onClick={onRunCode}
                    disabled={isRunning || isSubmitting}
                >
                    <Play className="mr-2 size-3.5 text-primary" />
                    <span>Run Code</span>
                    <ContextMenuShortcut>Ctrl+'</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                    onClick={onSubmitCode}
                    disabled={isRunning || isSubmitting}
                >
                    <Send className="mr-2 size-3.5 text-primary" />
                    <span>Submit Solution</span>
                    <ContextMenuShortcut>Ctrl+↵</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleCopy}>
                    <Copy className="mr-2 size-3.5" />
                    <span>Copy Editor Code</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={onResetCode}>
                    <RotateCcw className="mr-2 size-3.5" />
                    <span>Reset to Starter Code</span>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => setIsFullscreen(!isFullscreen)}>
                    {isFullscreen ? (
                        <Minimize2 className="mr-2 size-3.5" />
                    ) : (
                        <Maximize2 className="mr-2 size-3.5" />
                    )}
                    <span>
                        {isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
                    </span>
                </ContextMenuItem>
                <ContextMenuItem
                    onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                >
                    <Terminal className="mr-2 size-3.5 text-primary" />
                    <span>
                        {isConsoleOpen ? "Collapse Console" : "Open Console"}
                    </span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
