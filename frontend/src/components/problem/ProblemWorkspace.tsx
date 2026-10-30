import {
    useState,
    useEffect,
    useRef,
    useCallback,
    type CSSProperties,
} from "react"
import { ProblemLeftPane } from "./ProblemLeftPane"
import { CodeEditorPane } from "./CodeEditorPane"
import { useWorkspace } from "@/context/WorkspaceContext"
import { GripVertical } from "lucide-react"
import { usePaneResize } from "@/hooks/usePaneResize"

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

    const containerRef = useRef<HTMLDivElement>(null)
    const applySplit = useCallback((value: number) => {
        containerRef.current?.style.setProperty("--split", `${value}%`)
    }, [])
    const getSplitBounds = useCallback(
        () => ({
            min: 25,
            max: 75,
            unitsPerPixel: 100 / (containerRef.current?.clientWidth || 1),
        }),
        []
    )
    const {
        value: splitPercent,
        setValue: setSplitPercent,
        separatorProps,
    } = usePaneResize({
        axis: "x",
        initialValue: 45,
        getBounds: getSplitBounds,
        applyValue: applySplit,
    })

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
        <section
            aria-label="Coding workspace"
            className="page-enter flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 md:overflow-hidden md:px-5 md:pb-5"
        >
            <div className="flex shrink-0 items-center justify-between gap-4 px-1 py-5 md:px-2 md:py-6">
                <div>
                    <h1 className="editorial-title text-[26px] md:text-[30px]">
                        Workspace
                    </h1>
                </div>
                <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                    <span
                        className="h-px w-8 bg-primary/35"
                        aria-hidden="true"
                    />
                    <span>{currentProblem.category}</span>
                    <span className="font-mono text-[10px]">
                        / {String(currentProblem.numericId).padStart(2, "0")}
                    </span>
                </div>
            </div>
            <div
                ref={containerRef}
                style={{ "--split": `${splitPercent}%` } as CSSProperties}
                className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-0"
            >
                {/* Reading pane */}
                <div className="workspace-panel h-[480px] shrink-0 md:h-full md:w-[var(--split)]">
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
                    {...separatorProps}
                    className="group hidden w-4 shrink-0 cursor-col-resize touch-none items-center justify-center rounded-md transition-colors select-none hover:bg-primary/10 active:bg-primary/15 md:flex"
                    role="separator"
                    aria-label="Resize description and editor panes"
                    aria-orientation="vertical"
                    aria-valuemin={25}
                    aria-valuemax={75}
                    tabIndex={0}
                    onKeyDown={(event) => {
                        if (
                            event.key === "ArrowLeft" ||
                            event.key === "ArrowRight"
                        ) {
                            event.preventDefault()
                            setSplitPercent(
                                splitPercent +
                                    (event.key === "ArrowLeft" ? -2 : 2)
                            )
                        }
                    }}
                    title="Drag or use arrow keys to resize split panes"
                >
                    <GripVertical className="size-3 text-muted-foreground/60 transition-colors group-hover:text-primary" />
                </div>

                {/* Editor and test console */}
                <div className="workspace-panel h-[560px] shrink-0 md:h-full md:flex-1">
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
            <div className="hidden shrink-0 items-center justify-end px-1 pt-3 text-[10px] text-muted-foreground md:flex">
                <span className="flex items-center gap-4">
                    <span>
                        Run <kbd className="ml-1 font-mono">⌘ / Ctrl + '</kbd>
                    </span>
                    <span>
                        Submit{" "}
                        <kbd className="ml-1 font-mono">⌘ / Ctrl + Enter</kbd>
                    </span>
                </span>
            </div>
        </section>
    )
}
