import { useId, useState } from "react"
import type { TestCase } from "@/types"

export function TestCasesPanel({ testCases }: { testCases: TestCase[] }) {
    const customInputId = useId()
    const [selectedCaseIndex, setSelectedCaseIndex] = useState(0)
    const [customInput, setCustomInput] = useState("")
    const [isCustomCase, setIsCustomCase] = useState(false)
    const currentCase = testCases[selectedCaseIndex] ?? testCases[0]

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
                {testCases.map((testCase, index) => (
                    <button
                        key={testCase.id}
                        onClick={() => {
                            setSelectedCaseIndex(index)
                            setIsCustomCase(false)
                        }}
                        className={`rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                            !isCustomCase && selectedCaseIndex === index
                                ? "bg-primary font-semibold text-primary-foreground"
                                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                        {testCase.name}
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
            {isCustomCase ? (
                <div className="space-y-1.5">
                    <label
                        htmlFor={customInputId}
                        className="block text-[11px] font-semibold text-muted-foreground"
                    >
                        Custom Input:
                    </label>
                    <textarea
                        id={customInputId}
                        value={customInput}
                        onChange={(event) => setCustomInput(event.target.value)}
                        placeholder="e.g. num1 = 5, num2 = 8"
                        className="h-16 w-full resize-none rounded border border-border bg-background p-2 font-mono text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                    />
                </div>
            ) : currentCase ? (
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
                            {currentCase.expectedOutput}
                        </pre>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
