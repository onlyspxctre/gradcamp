import { useState, useEffect } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import {
    Play,
    Pause,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Workflow,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const PRESETS = [
    { a: 12, b: 5 },
    { a: -10, b: 4 },
    { a: 25, b: 17 },
    { a: 0, b: 0 },
]

export function AddTwoIntegersVisualizer() {
    const [num1, setNum1] = useState(12)
    const [num2, setNum2] = useState(5)
    const [currentStep, setCurrentStep] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const reducedMotion = useReducedMotion()
    const sum = num1 + num2
    const steps = [
        {
            title: "Pass",
            description: `The caller invokes add(${num1}, ${num2}). These values become the parameters a and b.`,
        },
        {
            title: "Read",
            description: `Inside add(), read a (${num1}) and b (${num2}) to evaluate the expression a + b.`,
        },
        {
            title: "Add",
            description: `Add the two integers: ${num1} + ${num2} = ${sum}. The computed sum is ready to return.`,
        },
        {
            title: "Return",
            description: `Return ${sum} to the caller. The expression add(${num1}, ${num2}) now evaluates to ${sum}.`,
        },
    ]

    useEffect(() => {
        if (!isPlaying || reducedMotion) return
        const timer = setInterval(
            () => setCurrentStep((step) => (step + 1) % 4),
            3500
        )
        return () => clearInterval(timer)
    }, [isPlaying, reducedMotion])

    const moveToStep = (step: number) => {
        setCurrentStep(step)
        setIsPlaying(false)
    }

    return (
        <section
            aria-label="Addition walkthrough"
            className="overflow-hidden rounded-lg border border-border bg-linear-to-br from-secondary/55 via-card to-card"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                    <Workflow className="size-3.5 text-primary" />
                    Execution walkthrough
                </div>
                <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label="Example inputs"
                >
                    {PRESETS.map(({ a, b }) => (
                        <button
                            key={`${a},${b}`}
                            className={`rounded px-1.5 py-1 font-mono text-[10px] transition-colors ${num1 === a && num2 === b ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
                            aria-pressed={num1 === a && num2 === b}
                            onClick={() => {
                                setNum1(a)
                                setNum2(b)
                                moveToStep(0)
                            }}
                            aria-label={`Use inputs ${a} and ${b}`}
                        >
                            {a}, {b}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 pt-4 pb-3">
                <div
                    className="grid grid-cols-4 gap-2"
                    role="group"
                    aria-label="Walkthrough steps"
                >
                    {steps.map((step, index) => (
                        <button
                            key={step.title}
                            className={`border-t-2 pt-2 text-left transition-colors ${currentStep === index ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                            onClick={() => moveToStep(index)}
                            aria-pressed={currentStep === index}
                        >
                            <span className="mr-1.5 font-mono text-[9px] opacity-60">
                                0{index + 1}
                            </span>
                            <span className="text-[11px]">{step.title}</span>
                        </button>
                    ))}
                </div>

                <div
                    className="flex h-28 items-center justify-center overflow-hidden"
                    aria-hidden="true"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, y: reducedMotion ? 0 : 7 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: reducedMotion ? 0 : -7 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-3"
                        >
                            {currentStep === 0 ? (
                                <>
                                    <span className="font-mono text-sm text-muted-foreground">
                                        add
                                    </span>
                                    <span className="font-heading text-3xl text-primary">
                                        ({num1}, {num2})
                                    </span>
                                </>
                            ) : currentStep === 3 ? (
                                <>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        return
                                    </span>
                                    <span className="font-heading text-4xl text-primary">
                                        {sum}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        ;
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="font-heading text-3xl text-primary">
                                        {num1}
                                    </span>
                                    <span className="font-heading text-2xl text-muted-foreground">
                                        +
                                    </span>
                                    <span className="font-heading text-3xl text-secondary-foreground">
                                        {num2}
                                    </span>
                                    {currentStep === 2 && (
                                        <>
                                            <span className="font-heading text-2xl text-muted-foreground">
                                                =
                                            </span>
                                            <span className="font-heading text-4xl text-primary">
                                                {sum}
                                            </span>
                                        </>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-[10px] text-muted-foreground">
                    <label className="flex items-center gap-2">
                        a
                        <input
                            type="number"
                            aria-label="First integer"
                            value={num1}
                            onChange={(event) =>
                                setNum1(Number(event.target.value) || 0)
                            }
                            className="w-14 rounded-sm border border-input bg-card/70 px-1 py-1 text-center font-mono text-[11px] text-foreground"
                        />
                    </label>
                    <label className="flex items-center gap-2">
                        b
                        <input
                            type="number"
                            aria-label="Second integer"
                            value={num2}
                            onChange={(event) =>
                                setNum2(Number(event.target.value) || 0)
                            }
                            className="w-14 rounded-sm border border-input bg-card/70 px-1 py-1 text-center font-mono text-[11px] text-foreground"
                        />
                    </label>
                </div>
                <p
                    className="min-h-14 text-[11px] leading-relaxed text-muted-foreground"
                    aria-live={isPlaying ? "off" : "polite"}
                >
                    {steps[currentStep].description}
                </p>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/70 px-3 py-2">
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Previous step"
                        onClick={() => moveToStep(currentStep - 1)}
                        disabled={currentStep === 0}
                    >
                        <ChevronLeft className="size-3.5" />
                    </Button>
                    <span className="px-1 font-mono text-[10px] text-muted-foreground">
                        {currentStep + 1} / 4
                    </span>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Next step"
                        onClick={() => moveToStep(currentStep + 1)}
                        disabled={currentStep === 3}
                    >
                        <ChevronRight className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Restart walkthrough"
                        onClick={() => moveToStep(0)}
                    >
                        <RotateCcw className="size-3" />
                    </Button>
                </div>
                {!reducedMotion && (
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setIsPlaying(!isPlaying)}
                        aria-pressed={isPlaying}
                        className="text-primary"
                    >
                        {isPlaying ? (
                            <Pause className="size-3" />
                        ) : (
                            <Play className="size-3" />
                        )}
                        {isPlaying ? "Pause" : "Play walkthrough"}
                    </Button>
                )}
            </div>
        </section>
    )
}
