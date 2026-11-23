import { useCallback } from "react"
import { POINTER_CHAPTERS, makeMemory } from "@/data/pointers"
import { pointerLectureProgress } from "@/data/pointerProgressDefinitions"
import { useAssignmentProgress } from "@/context/LearningContext"
import { MemoryDiagram } from "./MemoryDiagram"
import { CodeTrace } from "./CodeTrace"
import { LessonPlayer } from "./LessonPlayer"

export function PointerLesson({ onOpenQuiz }: { onOpenQuiz?: () => void }) {
    const { progress, dispatch } = useAssignmentProgress(pointerLectureProgress)
    const navigate = useCallback(
        (chapter: number, step: number) => {
            dispatch({ type: "lesson-step", chapter, step })
        },
        [dispatch]
    )

    return (
        <LessonPlayer
            sections={POINTER_CHAPTERS}
            progress={progress}
            onNavigate={navigate}
            onComplete={() => dispatch({ type: "complete-lesson" })}
            sidebarNote="This is a simulated memory model. Addresses and int sizes vary on real systems."
            followUp={
                onOpenQuiz && {
                    label: "Open memory lab",
                    completionLabel: "Continue to the quiz",
                    onOpen: onOpenQuiz,
                }
            }
            renderSectionContent={(section, activeFrame) => (
                <>
                    <CodeTrace
                        lines={section.code}
                        activeLine={activeFrame?.activeLine}
                    />
                    <div className="border-l-2 border-primary/35 pl-4">
                        <h3 className="eyebrow mb-2">Key distinction</h3>
                        <p className="text-xs leading-6 text-foreground/85">
                            {section.takeaway}
                        </p>
                    </div>
                </>
            )}
            renderVisualization={(frame) => (
                <MemoryDiagram
                    cells={makeMemory(frame.values)}
                    pointer={frame.pointer}
                    highlightIndex={frame.highlightIndex}
                />
            )}
        />
    )
}
