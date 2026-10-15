import * as React from "react"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/components/ui/context-menu"
import {
    Play,
    Send,
    Copy,
    RotateCcw,
    Maximize2,
    Terminal,
    Code2,
} from "lucide-react"

interface EditorContextMenuProps {
    children: React.ReactNode
    onRunCode?: () => void
    onSubmitCode?: () => void
    onCopyCode?: () => void
    onResetCode?: () => void
    onToggleFullscreen?: () => void
    onToggleConsole?: () => void
    isRunning?: boolean
    isSubmitting?: boolean
}

/**
 * Skeleton ContextMenu wrapper component for code workspaces and panels.
 * Can wrap any container to provide right-click shortcut actions.
 */
export function EditorContextMenu({
    children,
    onRunCode,
    onSubmitCode,
    onCopyCode,
    onResetCode,
    onToggleFullscreen,
    onToggleConsole,
    isRunning = false,
    isSubmitting = false,
}: EditorContextMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-56 text-xs">
                <ContextMenuItem
                    onClick={onRunCode}
                    disabled={isRunning || isSubmitting}
                >
                    <Play className="mr-2 size-3.5 fill-emerald-500 text-emerald-500" />
                    <span>Run Code</span>
                    <ContextMenuShortcut>Ctrl+'</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                    onClick={onSubmitCode}
                    disabled={isRunning || isSubmitting}
                >
                    <Send className="mr-2 size-3.5 text-emerald-500" />
                    <span>Submit Solution</span>
                    <ContextMenuShortcut>Ctrl+↵</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onCopyCode}>
                    <Copy className="mr-2 size-3.5" />
                    <span>Copy Code</span>
                    <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={onResetCode}>
                    <RotateCcw className="mr-2 size-3.5" />
                    <span>Reset Code</span>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuSub>
                    <ContextMenuSubTrigger>
                        <Code2 className="mr-2 size-3.5" />
                        <span>View Options</span>
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 text-xs">
                        <ContextMenuItem onClick={onToggleFullscreen}>
                            <Maximize2 className="mr-2 size-3.5" />
                            <span>Toggle Fullscreen</span>
                        </ContextMenuItem>
                        <ContextMenuItem onClick={onToggleConsole}>
                            <Terminal className="mr-2 size-3.5 text-blue-500" />
                            <span>Toggle Console</span>
                        </ContextMenuItem>
                    </ContextMenuSubContent>
                </ContextMenuSub>
            </ContextMenuContent>
        </ContextMenu>
    )
}
