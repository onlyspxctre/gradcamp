import { useCallback, useRef, type CSSProperties, type RefObject } from "react"
import {
    ChevronDown,
    ChevronUp,
    GripHorizontal,
    Loader2,
    Terminal,
} from "lucide-react"
import { usePaneResize } from "@/hooks/usePaneResize"
import { SubmissionResult } from "@/components/submissions/SubmissionResult"
import type { ConsoleTab, Submission, TestCase } from "@/types"
import { TestCasesPanel } from "./TestCasesPanel"

interface EditorConsoleProps {
    testCases: TestCase[]
    editorContainerRef: RefObject<HTMLDivElement | null>
    tab: ConsoleTab
    onTabChange: (tab: ConsoleTab) => void
    isOpen: boolean
    onToggle: () => void
    submission: Submission | null
    isSubmitting: boolean
    statusDetail?: string
}

export function EditorConsole({
    testCases,
    editorContainerRef,
    tab,
    onTabChange,
    isOpen,
    onToggle,
    submission,
    isSubmitting,
    statusDetail,
}: EditorConsoleProps) {
    const bodyRef = useRef<HTMLDivElement>(null)
    const applyHeight = useCallback((height: number) => {
        bodyRef.current?.style.setProperty("--console-height", `${height}px`)
    }, [])
    const getBounds = useCallback(
        () => ({
            min: 60,
            // Keep the editor usable and all console actions inside the pane.
            max: Math.max(
                60,
                (bodyRef.current?.clientHeight ?? 180) +
                    (editorContainerRef.current?.clientHeight ?? 140) -
                    140
            ),
            unitsPerPixel: -1,
        }),
        [editorContainerRef]
    )
    const {
        value: height,
        setValue: setHeight,
        separatorProps,
    } = usePaneResize({
        axis: "y",
        initialValue: 180,
        getBounds,
        applyValue: applyHeight,
    })

    return (
        <>
            {isOpen && (
                <div
                    {...separatorProps}
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
                            setHeight(
                                height + (event.key === "ArrowUp" ? 20 : -20)
                            )
                        }
                    }}
                    title="Drag or use arrow keys to resize console"
                >
                    <GripHorizontal className="size-3 text-muted-foreground/60 transition-colors group-hover:text-primary" />
                </div>
            )}
            <div className="flex shrink-0 flex-col border-t border-border bg-card">
                <div className="flex min-h-11 shrink-0 items-center overflow-x-auto border-b border-border/80 px-3 py-1.5 text-[11px]">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onToggle}
                            className="mr-2 flex items-center gap-1.5 rounded px-2 py-1 font-semibold text-foreground transition-colors hover:bg-muted"
                            title={
                                isOpen ? "Collapse console" : "Expand console"
                            }
                        >
                            <Terminal className="size-3.5 text-primary" />
                            <span className="hidden lg:inline">Console</span>
                            {isOpen ? (
                                <ChevronDown className="size-3" />
                            ) : (
                                <ChevronUp className="size-3" />
                            )}
                        </button>
                        {isOpen && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onTabChange("testcase")}
                                    className={`rounded-md px-2.5 py-1 transition-colors ${
                                        tab === "testcase"
                                            ? "bg-background font-semibold text-foreground shadow-xs"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    }`}
                                >
                                    Test cases
                                </button>
                                <button
                                    onClick={() => onTabChange("submission")}
                                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                                        tab === "submission"
                                            ? "bg-background font-semibold text-foreground shadow-xs"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    }`}
                                >
                                    <span>Submission</span>
                                    {submission && (
                                        <span
                                            className={`size-1.5 rounded-full ${submission.status === "Accepted" ? "bg-success" : "bg-destructive"}`}
                                        />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div
                    ref={bodyRef}
                    style={
                        {
                            "--console-height": `${height}px`,
                            height: isOpen ? "var(--console-height)" : "0px",
                        } as CSSProperties
                    }
                    className="console-body overflow-hidden bg-muted/10 transition-[height] duration-200 ease-in-out"
                >
                    <div className="h-full space-y-3 overflow-y-auto p-3.5 text-xs">
                        {/* Keep this mounted so selecting results or collapsing the console
                            does not discard the custom input or selected example. */}
                        <div hidden={tab !== "testcase"}>
                            <TestCasesPanel testCases={testCases} />
                        </div>
                        {tab === "submission" && (
                            <div className="space-y-3">
                                {isSubmitting ? (
                                    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                                        <Loader2 className="size-6 animate-spin text-primary" />
                                        <span className="text-sm font-semibold text-foreground">
                                            Submitting to Backend Worker
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {statusDetail ||
                                                "Uploading to /upload..."}
                                        </span>
                                    </div>
                                ) : submission ? (
                                    <SubmissionResult submission={submission} />
                                ) : (
                                    <div className="py-4 text-center text-muted-foreground">
                                        Submit your solution to check it against
                                        the test cases.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
