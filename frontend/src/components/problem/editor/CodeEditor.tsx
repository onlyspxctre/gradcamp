import { useEffect, useRef, type RefObject } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import { Loader2 } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { configureEditorThemes } from "@/lib/editorThemes"

interface CodeEditorProps {
    code: string
    onChange: (code: string) => void
    language: string
    fontSize: number
    containerRef: RefObject<HTMLDivElement | null>
}

export function CodeEditor({
    code,
    onChange,
    language,
    fontSize,
    containerRef,
}: CodeEditorProps) {
    const { resolvedTheme } = useTheme()
    const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
    const lastSizeRef = useRef({ width: 0, height: 0 })

    const handleMount: OnMount = (editor) => {
        editorRef.current = editor
        const container = containerRef.current
        if (!container) return
        const size = {
            width: container.clientWidth,
            height: container.clientHeight,
        }
        lastSizeRef.current = size
        editor.layout(size)
    }

    // One layout owner: observe the actual box, without Monaco auto-layout or
    // React updates on each drag frame. The console reads this same box's bounds.
    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const observer = new ResizeObserver(([entry]) => {
            if (!editorRef.current) return
            const size = {
                width: Math.floor(entry.contentRect.width),
                height: Math.floor(entry.contentRect.height),
            }
            const previous = lastSizeRef.current
            if (
                size.width <= 0 ||
                size.height <= 0 ||
                (size.width === previous.width &&
                    size.height === previous.height)
            )
                return
            lastSizeRef.current = size
            editorRef.current.layout(size)
        })
        observer.observe(container)
        return () => observer.disconnect()
    }, [containerRef])

    return (
        <div
            ref={containerRef}
            role="region"
            aria-label="Code editor"
            className="relative min-h-[140px] w-full flex-1 overflow-hidden bg-[var(--editor-background)]"
        >
            <div className="absolute inset-0 h-full w-full">
                <Editor
                    height="100%"
                    width="100%"
                    language={language}
                    value={code}
                    onChange={(value) => onChange(value ?? "")}
                    onMount={handleMount}
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
    )
}
