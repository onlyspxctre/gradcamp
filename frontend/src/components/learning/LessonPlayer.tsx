import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import { Check, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PlayerSection {
    id: string
    title: string
    summary?: string
    frames: readonly { explanation: string; result?: string }[]
}

interface LessonPlayerProps<Section extends PlayerSection> {
    /** At least one section, each with at least one frame. */
    sections: readonly Section[]
    /** The caller owns progress and supplies a valid section and step index. */
    progress: {
        chapter: number
        step: number
        viewed: readonly string[]
        completed: boolean
    }
    onNavigate: (chapter: number, step: number) => void
    onComplete: () => void
    renderSectionContent?: (
        section: Section,
        activeFrame: Section["frames"][number] | undefined
    ) => ReactNode
    renderVisualization?: (frame: Section["frames"][number]) => ReactNode
    sidebarNote?: ReactNode
    followUp?: { label: string; completionLabel: string; onOpen: () => void }
}

export function LessonPlayer<Section extends PlayerSection>({
    sections,
    progress: { chapter: chapterIndex, step, viewed, completed },
    onNavigate,
    onComplete,
    renderSectionContent,
    renderVisualization,
    sidebarNote,
    followUp,
}: LessonPlayerProps<Section>) {
    const chapter = sections[chapterIndex]
    const frame = chapter.frames[step]
    const allSectionsViewed = sections.every((section) =>
        viewed.includes(section.id)
    )
    const headingId = useId()
    const [playing, setPlaying] = useState(false)
    const reducedMotion = usePrefersReducedMotion()
    const articleRef = useRef<HTMLElement>(null)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const revealSectionRef = useRef(false)
    useEffect(() => {
        if (!revealSectionRef.current) return
        revealSectionRef.current = false
        headingRef.current?.focus({ preventScroll: true })
        articleRef.current?.scrollIntoView({
            block: "start",
            behavior: "instant",
        })
    }, [chapterIndex])
    const lastStep = step === chapter.frames.length - 1
    const lastChapter = chapterIndex === sections.length - 1

    useEffect(() => {
        if (!playing || reducedMotion) return
        const timer = setTimeout(() => {
            if (!lastStep) onNavigate(chapterIndex, step + 1)
            else if (!lastChapter) onNavigate(chapterIndex + 1, 0)
            else setPlaying(false)
        }, 4000)
        return () => clearTimeout(timer)
    }, [
        playing,
        reducedMotion,
        lastStep,
        lastChapter,
        chapterIndex,
        step,
        onNavigate,
    ])

    const go = (
        nextChapter: number,
        nextStep: number,
        revealSection = false
    ) => {
        revealSectionRef.current = revealSection && nextChapter !== chapterIndex
        setPlaying(false)
        onNavigate(nextChapter, nextStep)
    }

    return (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
            <aside className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="eyebrow">Sections</h2>
                    <span className="font-mono text-[10px] text-muted-foreground">
                        {viewed.length} / {sections.length}
                    </span>
                </div>
                <nav
                    aria-label="Lesson sections"
                    className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible"
                >
                    {sections.map((item, index) => (
                        <button
                            key={item.id}
                            onClick={() => go(index, 0, true)}
                            aria-current={
                                index === chapterIndex ? "step" : undefined
                            }
                            className={`flex min-w-44 items-center gap-3 rounded-md border px-3 py-3 text-left text-xs transition-colors lg:min-w-0 ${index === chapterIndex ? "border-primary/25 bg-secondary text-foreground" : "border-transparent text-muted-foreground hover:bg-secondary/50"}`}
                        >
                            <span className="flex size-5 shrink-0 items-center justify-center font-mono text-[10px] text-primary">
                                {viewed.includes(item.id) ? (
                                    <Check
                                        className="size-3.5"
                                        aria-label="Section explored"
                                    />
                                ) : (
                                    String(index + 1).padStart(2, "0")
                                )}
                            </span>
                            <span>{item.title}</span>
                        </button>
                    ))}
                </nav>
                {sidebarNote && (
                    <p className="mt-4 hidden text-[11px] leading-relaxed text-muted-foreground lg:block">
                        {sidebarNote}
                    </p>
                )}
            </aside>

            <article
                ref={articleRef}
                className="min-w-0 overflow-hidden rounded-xl border border-border bg-card/85"
                aria-labelledby={headingId}
            >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-7">
                    <span className="eyebrow">
                        Section {chapterIndex + 1} of {sections.length}
                    </span>
                    {!reducedMotion && (
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setPlaying(!playing)}
                            aria-pressed={playing}
                            className="text-primary"
                        >
                            {playing ? (
                                <Pause className="size-3" />
                            ) : (
                                <Play className="size-3" />
                            )}
                            {playing ? "Pause walkthrough" : "Play walkthrough"}
                        </Button>
                    )}
                </div>
                <div className="grid min-w-0 gap-7 p-5 md:p-7 xl:grid-cols-2">
                    {/* Overlapping grid items reserve the tallest section at the current
                        width/font size, without fixed heights or nested scrolling. */}
                    <div className="grid min-w-0">
                        {sections.map((section, index) => {
                            const active = index === chapterIndex
                            return (
                                <div
                                    key={section.id}
                                    aria-hidden={!active}
                                    inert={!active}
                                    className={`col-start-1 row-start-1 min-w-0 space-y-5 ${active ? "" : "invisible"}`}
                                >
                                    <div>
                                        <h2
                                            ref={
                                                active ? headingRef : undefined
                                            }
                                            tabIndex={-1}
                                            id={active ? headingId : undefined}
                                            className="editorial-title text-3xl"
                                        >
                                            {section.title}
                                        </h2>
                                        {section.summary && (
                                            <p className="mt-4 text-sm leading-7 text-muted-foreground">
                                                {section.summary}
                                            </p>
                                        )}
                                    </div>
                                    {renderSectionContent?.(
                                        section,
                                        active ? frame : undefined
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div className="min-w-0 space-y-4">
                        {renderVisualization?.(frame)}
                        <div
                            className="grid min-w-0"
                            aria-live={playing ? "off" : "polite"}
                        >
                            {sections.flatMap((section, sectionIndex) =>
                                section.frames.map((note, noteIndex) => {
                                    const active =
                                        sectionIndex === chapterIndex &&
                                        noteIndex === step
                                    return (
                                        <div
                                            key={`${section.id}-${noteIndex}`}
                                            aria-hidden={!active}
                                            inert={!active}
                                            className={`col-start-1 row-start-1 min-w-0 rounded-md border border-border bg-secondary/30 p-4 ${active ? "" : "invisible"}`}
                                        >
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                <span className="eyebrow whitespace-nowrap">
                                                    Step {noteIndex + 1} /{" "}
                                                    {section.frames.length}
                                                </span>
                                                {note.result && (
                                                    <output className="min-w-0 font-mono text-[11px] break-words text-primary">
                                                        {note.result}
                                                    </output>
                                                )}
                                            </div>
                                            <p className="text-xs leading-6 text-muted-foreground">
                                                {note.explanation}
                                            </p>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-3 border-t border-border px-5 py-4 sm:grid-cols-[1fr_auto_1fr] md:px-7">
                    <Button
                        variant="outline"
                        className="justify-self-start"
                        onClick={() =>
                            step > 0
                                ? go(chapterIndex, step - 1)
                                : go(
                                      chapterIndex - 1,
                                      sections[chapterIndex - 1].frames.length -
                                          1
                                  )
                        }
                        disabled={chapterIndex === 0 && step === 0}
                    >
                        <ChevronLeft className="size-3.5" />
                        Previous
                    </Button>
                    <div
                        className="flex gap-1.5 justify-self-end sm:justify-self-center"
                        role="group"
                        aria-label="Walkthrough steps"
                    >
                        {chapter.frames.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => go(chapterIndex, index)}
                                aria-label={`Go to step ${index + 1}`}
                                aria-pressed={step === index}
                                className={`h-2 w-5 rounded-full transition-colors ${index === step ? "bg-primary" : "bg-border hover:bg-primary/40"}`}
                            />
                        ))}
                    </div>
                    <div className="col-span-2 grid min-w-0 sm:col-span-1 sm:justify-self-end">
                        {/* Reserve the longest action label so the clickable area never shifts. */}
                        <Button
                            aria-hidden="true"
                            tabIndex={-1}
                            disabled
                            className="pointer-events-none invisible col-start-1 row-start-1 h-auto min-h-8 min-w-0 py-1 whitespace-normal"
                        >
                            <Check className="size-3.5" />
                            Mark lecture complete
                        </Button>
                        {!lastStep || !lastChapter ? (
                            <Button
                                className="col-start-1 row-start-1 h-auto min-h-8 w-full min-w-0 py-1 whitespace-normal"
                                onClick={() =>
                                    lastStep
                                        ? go(chapterIndex + 1, 0)
                                        : go(chapterIndex, step + 1)
                                }
                            >
                                {lastStep ? "Next section" : "Next step"}
                                <ChevronRight className="size-3.5" />
                            </Button>
                        ) : completed ? (
                            followUp && (
                                <Button
                                    className="col-start-1 row-start-1 h-auto min-h-8 w-full min-w-0 py-1 whitespace-normal"
                                    onClick={followUp.onOpen}
                                >
                                    {followUp.label}
                                    <ChevronRight className="size-3.5" />
                                </Button>
                            )
                        ) : (
                            <Button
                                className="col-start-1 row-start-1 h-auto min-h-8 w-full min-w-0 py-1 whitespace-normal"
                                onClick={onComplete}
                                disabled={!allSectionsViewed}
                            >
                                <Check className="size-3.5" />
                                Mark lecture complete
                            </Button>
                        )}
                    </div>
                </div>
                {lastStep &&
                    lastChapter &&
                    !completed &&
                    !allSectionsViewed && (
                        <p className="px-5 pb-4 text-xs text-muted-foreground">
                            Explore the last step of each section to complete
                            the lecture.
                        </p>
                    )}
                {completed && (
                    <div
                        className="flex flex-wrap items-center justify-between gap-3 border-t border-success/15 bg-success/5 px-5 py-4 text-xs text-success"
                        role="status"
                    >
                        <span className="flex items-center gap-2">
                            <Check className="size-4" />
                            Lecture completed. You can revisit any section.
                        </span>
                        {followUp && (
                            <button
                                onClick={followUp.onOpen}
                                className="font-medium underline underline-offset-4"
                            >
                                {followUp.completionLabel}
                            </button>
                        )}
                    </div>
                )}
            </article>
        </div>
    )
}
