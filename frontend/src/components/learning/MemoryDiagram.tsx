import { useId } from "react"
import { AnimatePresence, motion } from "motion/react"
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import { ArrowDown, ArrowRight } from "lucide-react"
import { formatAddress, type MemoryCell } from "@/data/pointers"

interface MemoryDiagramProps {
    cells: MemoryCell[]
    pointer: number | "null" | null
    highlightIndex?: number
    onSelect?: (index: number) => void
    disabled?: boolean
    label?: string
}

export function MemoryDiagram({
    cells,
    pointer,
    highlightIndex,
    onSelect,
    disabled,
    label = "Array memory",
}: MemoryDiagramProps) {
    const id = useId()
    const reducedMotion = usePrefersReducedMotion()
    const selected = typeof pointer === "number" ? cells[pointer] : null
    return (
        <div
            className="overflow-hidden rounded-lg border border-border bg-card"
            aria-label="Memory model"
        >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-3">
                <span className="eyebrow">{label}</span>
                <div
                    className="flex items-center gap-2 text-xs"
                    aria-live="polite"
                >
                    <span className="font-mono text-primary">p</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="font-mono text-foreground">
                        {selected
                            ? formatAddress(selected.address)
                            : pointer === "null"
                              ? "NULL"
                              : "not declared"}
                    </span>
                </div>
            </div>
            <table className="w-full text-left text-xs">
                <caption className="sr-only">
                    Memory addresses, objects, and stored integer values
                </caption>
                <thead className="text-[10px] text-muted-foreground">
                    <tr>
                        <th className="w-12 px-3 py-3">
                            <span className="sr-only">Pointer</span>
                        </th>
                        <th className="py-3 font-medium">Address</th>
                        <th className="py-3 font-medium">Object</th>
                        <th className="py-3 pr-4 text-right font-medium">
                            Value
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {cells.map((cell, index) => {
                        const active =
                            index ===
                            (highlightIndex ??
                                (typeof pointer === "number" ? pointer : -1))
                        return (
                            <tr
                                key={cell.address}
                                className={`border-t border-border/60 transition-colors duration-300 ${active ? "bg-accent/65" : "bg-transparent"}`}
                            >
                                <td className="relative h-14 px-3 text-primary">
                                    {pointer === index && (
                                        <motion.span
                                            layoutId={`${id}-pointer`}
                                            transition={
                                                reducedMotion
                                                    ? { duration: 0 }
                                                    : {
                                                          type: "spring",
                                                          stiffness: 330,
                                                          damping: 34,
                                                      }
                                            }
                                            className="flex items-center gap-0.5 font-mono text-[10px]"
                                            aria-label="p points here"
                                        >
                                            p<ArrowRight className="size-3" />
                                        </motion.span>
                                    )}
                                </td>
                                <td className="py-3 font-mono text-primary">
                                    {onSelect ? (
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => onSelect(index)}
                                            aria-label={`Point p to ${formatAddress(cell.address)}`}
                                            aria-pressed={pointer === index}
                                            className="-ml-1 rounded px-1 py-1 underline-offset-4 hover:underline disabled:cursor-default"
                                        >
                                            {formatAddress(cell.address)}
                                        </button>
                                    ) : (
                                        formatAddress(cell.address)
                                    )}
                                </td>
                                <td className="py-3 font-mono text-[11px] text-muted-foreground">
                                    {cell.label}
                                </td>
                                <td className="py-3 pr-4 text-right font-mono text-sm font-medium">
                                    <AnimatePresence
                                        mode="wait"
                                        initial={false}
                                    >
                                        <motion.span
                                            key={cell.value}
                                            initial={{
                                                opacity: 0,
                                                y: reducedMotion ? 0 : 5,
                                            }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{
                                                duration: reducedMotion
                                                    ? 0
                                                    : 0.18,
                                            }}
                                            className="inline-block"
                                        >
                                            {cell.value}
                                        </motion.span>
                                    </AnimatePresence>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            <div className="flex items-center gap-2 border-t border-border bg-muted/20 px-4 py-3 text-[10px] text-muted-foreground">
                <ArrowDown className="size-3" />
                Illustrative addresses · four bytes per int
            </div>
        </div>
    )
}
