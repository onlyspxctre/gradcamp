import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
    Play,
    Pause,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Sparkles,
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    Cpu,
    CornerDownRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Preset {
    label: string
    a: number
    b: number
}

const PRESETS: Preset[] = [
    { label: "12 + 5 (Example 1)", a: 12, b: 5 },
    { label: "-10 + 4 (Example 2)", a: -10, b: 4 },
    { label: "25 + 17", a: 25, b: 17 },
    { label: "0 + 0 (Example 3)", a: 0, b: 0 },
]

export function AddTwoIntegersVisualizer() {
    const [num1, setNum1] = useState<number>(12)
    const [num2, setNum2] = useState<number>(5)
    const [currentStep, setCurrentStep] = useState<number>(0)
    const [isPlaying, setIsPlaying] = useState<boolean>(true)
    const [direction, setDirection] = useState<number>(1)

    const sum = num1 + num2
    const totalSteps = 4

    // Auto-play slideshow timer
    useEffect(() => {
        if (!isPlaying) return

        const timer = setInterval(() => {
            setDirection(1)
            setCurrentStep((prev) => (prev + 1) % totalSteps)
        }, 3000)

        return () => clearInterval(timer)
    }, [isPlaying, totalSteps])

    const handleNext = () => {
        setDirection(1)
        setCurrentStep((prev) => (prev + 1) % totalSteps)
    }

    const handlePrev = () => {
        setDirection(-1)
        setCurrentStep((prev) => (prev - 1 + totalSteps) % totalSteps)
    }

    const handleStepClick = (stepIndex: number) => {
        setDirection(stepIndex > currentStep ? 1 : -1)
        setCurrentStep(stepIndex)
    }

    const handleReset = () => {
        setDirection(-1)
        setCurrentStep(0)
        setIsPlaying(false)
    }

    const selectPreset = (preset: Preset) => {
        setNum1(preset.a)
        setNum2(preset.b)
        setCurrentStep(0)
    }

    const stepInfo = [
        {
            title: "Pass Arguments",
            subtitle: "Caller calls add(a, b)",
            highlightLine: 1,
            description: `The caller invokes add(${num1}, ${num2}). In C execution, values ${num1} and ${num2} are placed into parameter registers/slots 'a' and 'b'.`,
        },
        {
            title: "Load Operands",
            subtitle: "Read parameters into ALU",
            highlightLine: 2,
            description: `Inside add(), the CPU reads variable a (${num1}) and variable b (${num2}) to prepare the addition expression 'a + b'.`,
        },
        {
            title: "Compute Sum",
            subtitle: "Execute arithmetic addition",
            highlightLine: 2,
            description: `The Arithmetic Logic Unit (ALU) performs the integer addition: ${num1} + ${num2} = ${sum}. The result is held in the accumulator register.`,
        },
        {
            title: "Return Result",
            subtitle: "Send sum back to caller",
            highlightLine: 2,
            description: `The function returns ${sum} to the caller frame. The expression add(${num1}, ${num2}) evaluates to ${sum}.`,
        },
    ]

    return (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
            {/* Header / Title */}
            <div className="flex flex-col gap-2 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="size-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">
                            Function Execution Visualizer
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            Interactive step-by-step walkthrough of{" "}
                            <code className="rounded bg-muted px-1 font-mono text-[10px]">
                                add(a, b)
                            </code>
                        </p>
                    </div>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[11px] font-medium text-muted-foreground">
                        Presets:
                    </span>
                    {PRESETS.map((preset, idx) => (
                        <button
                            key={idx}
                            onClick={() => selectPreset(preset)}
                            className={`rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors ${
                                num1 === preset.a && num2 === preset.b
                                    ? "bg-primary font-semibold text-primary-foreground"
                                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            {preset.a}, {preset.b}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input adjustment row */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 font-mono">
                    <span className="text-muted-foreground">Inputs:</span>
                    <label className="flex items-center gap-1">
                        <span className="font-semibold text-blue-500">a =</span>
                        <input
                            type="number"
                            value={num1}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0
                                setNum1(val)
                            }}
                            className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-center font-mono text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                        />
                    </label>
                    <label className="flex items-center gap-1">
                        <span className="font-semibold text-amber-500">
                            b =
                        </span>
                        <input
                            type="number"
                            value={num2}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0
                                setNum2(val)
                            }}
                            className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-center font-mono text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                        />
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                        Expected Return:{" "}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {sum}
                        </span>
                    </span>
                </div>
            </div>

            {/* Slideshow Progress Step Indicators */}
            <div className="mt-4 grid grid-cols-4 gap-1.5">
                {stepInfo.map((s, idx) => {
                    const isActive = currentStep === idx
                    const isPast = currentStep > idx
                    return (
                        <button
                            key={idx}
                            onClick={() => handleStepClick(idx)}
                            className={`group relative flex flex-col items-start rounded-md border p-2 text-left transition-all ${
                                isActive
                                    ? "border-primary bg-primary/5 text-foreground shadow-xs"
                                    : isPast
                                      ? "border-border/80 bg-muted/30 text-foreground/80 hover:bg-muted/50"
                                      : "border-border/40 bg-muted/10 text-muted-foreground hover:bg-muted/30"
                            }`}
                        >
                            <div className="flex w-full items-center justify-between font-mono text-[10px] font-bold">
                                <span>Step {idx + 1}</span>
                                {isPast && (
                                    <CheckCircle2 className="size-3 text-emerald-500" />
                                )}
                            </div>
                            <span className="mt-0.5 truncate text-[11px] leading-tight font-medium">
                                {s.title}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Animation Canvas Arena */}
            <div className="relative mt-4 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/40 to-muted/10 p-4">
                {/* Code Execution Strip */}
                <div className="mb-4 hidden rounded-lg border border-border/80 bg-background/80 p-2.5 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 border-b border-border/50 pb-1.5 font-sans text-[10px] font-medium text-muted-foreground">
                        <CornerDownRight className="size-3 text-primary" />
                        <span>C Function Call Trace:</span>
                    </div>
                    <div className="space-y-0.5 pt-1.5">
                        <div
                            className={`flex items-center gap-2 rounded px-2 py-0.5 transition-colors ${
                                stepInfo[currentStep].highlightLine === 1
                                    ? "bg-primary/15 font-semibold text-primary"
                                    : "text-muted-foreground"
                            }`}
                        >
                            <span className="w-3 text-right opacity-50 select-none">
                                1
                            </span>
                            <span>int add(int a, int b) &#123;</span>
                            {stepInfo[currentStep].highlightLine === 1 && (
                                <motion.span
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="ml-auto text-[10px] text-primary"
                                >
                                    ◀ entry
                                </motion.span>
                            )}
                        </div>
                        <div
                            className={`flex items-center gap-2 rounded px-2 py-0.5 transition-colors ${
                                stepInfo[currentStep].highlightLine === 2
                                    ? "bg-primary/15 font-semibold text-primary"
                                    : "text-muted-foreground"
                            }`}
                        >
                            <span className="w-3 text-right opacity-50 select-none">
                                2
                            </span>
                            <span>&nbsp;&nbsp;&nbsp;&nbsp;return a + b;</span>
                            {stepInfo[currentStep].highlightLine === 2 && (
                                <motion.span
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="ml-auto text-[10px] text-primary"
                                >
                                    ◀ evaluating
                                </motion.span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 rounded px-2 py-0.5 text-muted-foreground">
                            <span className="w-3 text-right opacity-50 select-none">
                                3
                            </span>
                            <span>&#125;</span>
                        </div>
                    </div>
                </div>

                {/* Animated Interactive Stage */}
                <div className="relative flex min-h-[170px] flex-col justify-center">
                    <AnimatePresence mode="wait" custom={direction}>
                        {currentStep === 0 && (
                            /* STEP 0: Pass Arguments */
                            <motion.div
                                key="step-0"
                                custom={direction}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                <div className="text-center">
                                    <div className="inline-block rounded-full bg-muted px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                        Caller Scope: invoking add({num1},{" "}
                                        {num2})
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-8">
                                    {/* Argument 1 */}
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className="font-mono text-[10px] text-muted-foreground">
                                            arg 1
                                        </span>
                                        <motion.div
                                            initial={{ scale: 0.8, y: -10 }}
                                            animate={{ scale: 1, y: 0 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                            }}
                                            className="flex size-11 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 font-mono text-base font-bold text-blue-600 shadow-sm dark:text-blue-400"
                                        >
                                            {num1}
                                        </motion.div>
                                        <motion.div
                                            animate={{ y: [0, 4, 0] }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1.5,
                                            }}
                                        >
                                            <ArrowDown className="size-3.5 text-blue-500" />
                                        </motion.div>
                                        <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                            param a
                                        </span>
                                    </div>

                                    {/* Argument 2 */}
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className="font-mono text-[10px] text-muted-foreground">
                                            arg 2
                                        </span>
                                        <motion.div
                                            initial={{ scale: 0.8, y: -10 }}
                                            animate={{ scale: 1, y: 0 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                delay: 0.1,
                                            }}
                                            className="flex size-11 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 font-mono text-base font-bold text-amber-600 shadow-sm dark:text-amber-400"
                                        >
                                            {num2}
                                        </motion.div>
                                        <motion.div
                                            animate={{ y: [0, 4, 0] }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1.5,
                                                delay: 0.2,
                                            }}
                                        >
                                            <ArrowDown className="size-3.5 text-amber-500" />
                                        </motion.div>
                                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                            param b
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 1 && (
                            /* STEP 1: Load Operands into ALU */
                            <motion.div
                                key="step-1"
                                custom={direction}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-3"
                            >
                                <div className="text-center">
                                    <div className="inline-block rounded-full bg-muted px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                        Local Variables Fetched for
                                        &apos;+&apos; operation
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-3 pt-5">
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                        }}
                                        className="relative"
                                    >
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 font-mono text-[10px] font-semibold whitespace-nowrap text-blue-500 select-none">
                                            a
                                        </span>
                                        <div className="flex size-11 items-center justify-center rounded-lg border-2 border-blue-500 bg-blue-500/15 font-mono text-base font-bold text-blue-600 shadow-sm dark:text-blue-400">
                                            {num1}
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        animate={{ scale: [1, 1.25, 1] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 1.2,
                                        }}
                                        className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-base font-bold text-primary-foreground shadow-xs"
                                    >
                                        +
                                    </motion.div>

                                    <motion.div
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                        }}
                                        className="relative"
                                    >
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 font-mono text-[10px] font-semibold whitespace-nowrap text-amber-500 select-none">
                                            b
                                        </span>
                                        <div className="flex size-11 items-center justify-center rounded-lg border-2 border-amber-500 bg-amber-500/15 font-mono text-base font-bold text-amber-600 shadow-sm dark:text-amber-400">
                                            {num2}
                                        </div>
                                    </motion.div>
                                </div>

                                <div className="text-center">
                                    <span className="font-mono text-[11px] text-muted-foreground">
                                        Expression:{" "}
                                        <span className="font-semibold text-foreground">
                                            {num1} + {num2}
                                        </span>
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            /* STEP 2: Compute Sum (ALU Addition) */
                            <motion.div
                                key="step-2"
                                custom={direction}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-3"
                            >
                                <div className="text-center">
                                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                                        <Cpu className="size-3" />
                                        <span>
                                            ALU Computing Integer Addition
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-2">
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {num1} + {num2}
                                    </span>
                                    <span className="font-mono text-sm font-bold text-foreground">
                                        =
                                    </span>

                                    <motion.div
                                        initial={{ scale: 0, rotate: -15 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 20,
                                        }}
                                        className="relative flex size-12 items-center justify-center rounded-xl border-2 border-emerald-500 bg-emerald-500/20 font-mono text-lg font-extrabold text-emerald-600 shadow-md ring-4 ring-emerald-500/20 dark:text-emerald-400"
                                    >
                                        <motion.div
                                            className="absolute -inset-1 rounded-xl bg-emerald-500/20 blur-xs"
                                            animate={{
                                                opacity: [0.3, 0.8, 0.3],
                                            }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1.5,
                                            }}
                                        />
                                        <span className="relative z-10">
                                            {sum}
                                        </span>
                                    </motion.div>
                                </div>

                                <div className="text-center">
                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground">
                                        Register %eax ={" "}
                                        <strong className="text-emerald-600 dark:text-emerald-400">
                                            {sum}
                                        </strong>
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            /* STEP 3: Return Result */
                            <motion.div
                                key="step-3"
                                custom={direction}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-3"
                            >
                                <div className="text-center">
                                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="size-3" />
                                        <span>Function Execution Complete</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center gap-1.5">
                                    <motion.div
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 1.4,
                                        }}
                                    >
                                        <ArrowUp className="size-4 text-emerald-500" />
                                    </motion.div>

                                    <motion.div
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 2,
                                        }}
                                        className="flex items-center gap-2 rounded-lg border-2 border-emerald-500 bg-emerald-500/15 px-3 py-1.5 font-mono text-sm font-bold text-emerald-600 shadow-sm dark:text-emerald-400"
                                    >
                                        <span>return</span>
                                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-base text-foreground">
                                            {sum}
                                        </span>
                                    </motion.div>

                                    <span className="pt-1 text-[11px] text-muted-foreground">
                                        Caller receives return value:{" "}
                                        <strong className="font-mono text-foreground">
                                            {sum}
                                        </strong>
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Explanation text banner */}
                <div className="mt-3 rounded-lg border border-border/60 bg-background/90 p-2.5 text-xs text-foreground/90">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                        <span>{stepInfo[currentStep].title}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                            Step {currentStep + 1} of {totalSteps}
                        </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {stepInfo[currentStep].description}
                    </p>
                </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="xs"
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        title="Previous step"
                    >
                        <ChevronLeft className="size-3.5" />
                        <span>Prev</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="xs"
                        onClick={handleNext}
                        disabled={currentStep === totalSteps - 1}
                        title="Next step"
                    >
                        <span>Next</span>
                        <ChevronRight className="size-3.5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={handleReset}
                        title="Restart slideshow"
                    >
                        <RotateCcw className="size-3" />
                        <span className="hidden sm:inline">Reset</span>
                    </Button>
                </div>

                <div className="flex items-center gap-1.5">
                    <Button
                        variant={isPlaying ? "secondary" : "outline"}
                        size="xs"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="text-xs"
                    >
                        {isPlaying ? (
                            <>
                                <Pause className="size-3 text-amber-500" />
                                <span>Pause</span>
                            </>
                        ) : (
                            <>
                                <Play className="size-3 text-emerald-500" />
                                <span>Auto Play</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
