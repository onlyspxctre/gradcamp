import type { ReactNode } from "react"
import {
    Copy,
    Maximize2,
    Minimize2,
    RotateCcw,
    Send,
    Terminal,
} from "lucide-react"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"

interface EditorContextMenuProps {
    children: ReactNode
    onSubmit: () => void
    isSubmitting: boolean
    onCopy: () => void
    onReset: () => void
    isFullscreen: boolean
    onToggleFullscreen: () => void
    isConsoleOpen: boolean
    onToggleConsole: () => void
}

export function EditorContextMenu({
    children,
    onSubmit,
    isSubmitting,
    onCopy,
    onReset,
    isFullscreen,
    onToggleFullscreen,
    isConsoleOpen,
    onToggleConsole,
}: EditorContextMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-56 text-xs">
                <ContextMenuItem onClick={onSubmit} disabled={isSubmitting}>
                    <Send className="mr-2 size-3.5 text-primary" />
                    <span>Submit Solution</span>
                    <ContextMenuShortcut>Ctrl+↵</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onCopy}>
                    <Copy className="mr-2 size-3.5" />
                    <span>Copy Editor Code</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={onReset}>
                    <RotateCcw className="mr-2 size-3.5" />
                    <span>Reset to Starter Code</span>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onToggleFullscreen}>
                    {isFullscreen ? (
                        <Minimize2 className="mr-2 size-3.5" />
                    ) : (
                        <Maximize2 className="mr-2 size-3.5" />
                    )}
                    <span>
                        {isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
                    </span>
                </ContextMenuItem>
                <ContextMenuItem onClick={onToggleConsole}>
                    <Terminal className="mr-2 size-3.5 text-primary" />
                    <span>
                        {isConsoleOpen ? "Collapse Console" : "Open Console"}
                    </span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
