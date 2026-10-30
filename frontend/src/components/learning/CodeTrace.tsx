export function CodeTrace({
    lines,
    activeLine,
}: {
    lines: string[]
    activeLine?: number
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-border bg-[var(--editor-background)]">
            <div className="border-b border-border px-4 py-2.5 text-[10px] tracking-wider text-muted-foreground uppercase">
                C · code trace
            </div>
            <pre
                className="overflow-x-auto py-3 font-mono text-[12px] leading-7"
                aria-label="C code"
            >
                <code>
                    {lines.map((line, index) => (
                        <span
                            key={index}
                            className={`flex min-w-max px-4 ${index === activeLine ? "bg-primary/8 text-foreground" : "text-muted-foreground"}`}
                            aria-current={
                                index === activeLine ? "step" : undefined
                            }
                        >
                            <span
                                className="mr-5 inline-block w-3 shrink-0 text-right text-[10px] opacity-60 select-none"
                                aria-hidden="true"
                            >
                                {index + 1}
                            </span>
                            <span>{line}</span>
                            <span
                                className={`ml-4 text-[10px] text-primary ${index === activeLine ? "" : "invisible"}`}
                                aria-hidden="true"
                            >
                                ←
                            </span>
                        </span>
                    ))}
                </code>
            </pre>
        </div>
    )
}
