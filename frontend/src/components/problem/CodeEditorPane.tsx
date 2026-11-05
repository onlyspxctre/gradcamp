import { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SUPPORTED_LANGUAGES } from "@/data/languages"
import type { Problem, Submission, ConsoleTab } from "@/types"
import { CodeEditor } from "./editor/CodeEditor"
import { EditorConsole } from "./editor/EditorConsole"
import { EditorContextMenu } from "./editor/EditorContextMenu"
import { EditorToolbar } from "./editor/EditorToolbar"

interface CodeEditorPaneProps {
    problem: Problem
    code: string
    setCode: (code: string) => void
    onSubmitCode: () => void
    onResetCode: () => void
    isSubmitting: boolean
    activeSubmission: Submission | null
    submissionStateDetail?: string
    consoleTab: ConsoleTab
    setConsoleTab: (tab: ConsoleTab) => void
    isConsoleOpen: boolean
    setIsConsoleOpen: (open: boolean) => void
}

export function CodeEditorPane({
    problem,
    code,
    setCode,
    onSubmitCode,
    onResetCode,
    isSubmitting,
    activeSubmission,
    submissionStateDetail,
    consoleTab,
    setConsoleTab,
    isConsoleOpen,
    setIsConsoleOpen,
}: CodeEditorPaneProps) {
    const [language, setLanguage] = useState(SUPPORTED_LANGUAGES[0])
    const [fontSize, setFontSize] = useState(14)
    const [isCopied, setIsCopied] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const editorContainerRef = useRef<HTMLDivElement>(null)
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(
        () => () => {
            if (copyTimerRef.current !== null)
                clearTimeout(copyTimerRef.current)
        },
        []
    )

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setIsCopied(true)
        if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
        copyTimerRef.current = setTimeout(() => setIsCopied(false), 1800)
    }
    const toggleFullscreen = () => setIsFullscreen((fullscreen) => !fullscreen)
    const toggleConsole = () => setIsConsoleOpen(!isConsoleOpen)

    return (
        <EditorContextMenu
            onSubmit={onSubmitCode}
            isSubmitting={isSubmitting}
            onCopy={handleCopy}
            onReset={onResetCode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            isConsoleOpen={isConsoleOpen}
            onToggleConsole={toggleConsole}
        >
            <div
                className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-card ${
                    isFullscreen ? "fixed inset-0 z-50" : "relative"
                }`}
            >
                <EditorToolbar
                    language={language}
                    onLanguageChange={setLanguage}
                    fontSize={fontSize}
                    onFontSizeChange={setFontSize}
                    isCopied={isCopied}
                    onCopy={handleCopy}
                    onReset={onResetCode}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={toggleFullscreen}
                />
                <CodeEditor
                    code={code}
                    onChange={setCode}
                    language={language.monacoLang}
                    fontSize={fontSize}
                    containerRef={editorContainerRef}
                />
                <EditorConsole
                    testCases={problem.testCases}
                    editorContainerRef={editorContainerRef}
                    tab={consoleTab}
                    onTabChange={setConsoleTab}
                    isOpen={isConsoleOpen}
                    onToggle={toggleConsole}
                    submission={activeSubmission}
                    isSubmitting={isSubmitting}
                    statusDetail={submissionStateDetail}
                />
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
                    <span className="font-mono text-[10px] text-muted-foreground">
                        {language.name}{" "}
                        <span className="mx-1 opacity-50">/</span>{" "}
                        {code.split("\n").length} lines
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={onSubmitCode}
                            disabled={isSubmitting}
                            className="gap-2 px-4 text-xs"
                        >
                            <Send className="size-3" />
                            {isSubmitting ? "Submitting…" : "Submit"}
                        </Button>
                    </div>
                </div>
            </div>
        </EditorContextMenu>
    )
}
