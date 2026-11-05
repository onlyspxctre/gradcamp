import { Check, Copy, Maximize2, Minimize2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SUPPORTED_LANGUAGES } from "@/data/languages"
import type { SupportedLanguage } from "@/types"

interface EditorToolbarProps {
    language: SupportedLanguage
    onLanguageChange: (language: SupportedLanguage) => void
    fontSize: number
    onFontSizeChange: (size: number) => void
    isCopied: boolean
    onCopy: () => void
    onReset: () => void
    isFullscreen: boolean
    onToggleFullscreen: () => void
}

export function EditorToolbar({
    language,
    onLanguageChange,
    fontSize,
    onFontSizeChange,
    isCopied,
    onCopy,
    onReset,
    isFullscreen,
    onToggleFullscreen,
}: EditorToolbarProps) {
    return (
        <div className="pane-toolbar flex-wrap gap-y-1 px-3 py-1.5">
            <div className="flex items-center gap-2">
                <Select
                    value={language.id}
                    onValueChange={(id) => {
                        const selected = SUPPORTED_LANGUAGES.find(
                            (item) => item.id === id
                        )
                        if (selected) onLanguageChange(selected)
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
                        {SUPPORTED_LANGUAGES.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                                {item.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                    {language.version}
                </span>
            </div>

            <div className="flex items-center gap-0.5">
                <Select
                    value={String(fontSize)}
                    onValueChange={(value) => onFontSizeChange(Number(value))}
                >
                    <SelectTrigger
                        size="sm"
                        className="h-7 w-[72px] border-transparent bg-transparent font-medium shadow-none"
                        aria-label="Editor font size"
                        title="Editor Font Size"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                        {[12, 13, 14, 16].map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size}px
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="xs"
                    onClick={onReset}
                    title="Reset code template"
                    className="text-muted-foreground hover:text-foreground"
                >
                    <RotateCcw className="size-3" />
                    <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                    variant="ghost"
                    size="xs"
                    onClick={onCopy}
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
                <Button
                    variant="ghost"
                    size="xs"
                    onClick={onToggleFullscreen}
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
    )
}
