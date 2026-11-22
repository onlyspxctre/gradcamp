import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CustomExerciseForm } from "./CustomExerciseForm"
import {
    saveCustomExercise,
    loadCustomExercises,
    type CustomExercise,
    type ExerciseDraft,
} from "./customExercises"

function load() {
    try {
        return { exercises: loadCustomExercises(), error: "" }
    } catch {
        return {
            exercises: [],
            error: "Could not read custom exercises from browser storage.",
        }
    }
}

export function CustomExercisesPanel({
    searchQuery,
    onCreated,
    onOpen,
}: {
    searchQuery: string
    onCreated: () => void
    onOpen: (exercise: CustomExercise, displayNumber: number) => void
}) {
    const [{ exercises, error }, setSaved] = useState(load)
    const [showForm, setShowForm] = useState(false)
    const query = searchQuery.trim().toLowerCase()
    const visible = exercises.filter(({ title }) =>
        title.toLowerCase().includes(query)
    )

    function save(draft: ExerciseDraft) {
        try {
            const saved = saveCustomExercise(draft)
            setSaved({ exercises: saved.exercises, error: "" })
        } catch {
            setSaved({
                exercises,
                error: "Could not save this exercise. Check that browser storage is available.",
            })
            return
        }
        setShowForm(false)
        onCreated()
    }

    return (
        <section
            aria-labelledby="custom-exercises-heading"
            className="space-y-4"
        >
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2
                        id="custom-exercises-heading"
                        className="font-heading text-2xl"
                    >
                        Custom exercises
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Demo only. Exercises are saved and tested in this
                        browser, separately from the C grader.
                    </p>
                </div>
                {!showForm && (
                    <Button type="button" onClick={() => setShowForm(true)}>
                        Create custom exercise
                    </Button>
                )}
            </header>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            {showForm ? (
                <CustomExerciseForm
                    initial={null}
                    onSave={save}
                    onCancel={() => setShowForm(false)}
                />
            ) : visible.length === 0 ? (
                <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                    {exercises.length === 0
                        ? "No custom exercises yet."
                        : "No custom exercises match your search."}
                </p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card/80">
                    {visible.map((exercise) => (
                        <li
                            key={exercise.id}
                            className="flex flex-wrap items-center justify-between gap-2 p-4"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    onOpen(
                                        exercise,
                                        exercises.indexOf(exercise) + 1
                                    )
                                }
                                className="min-w-0 text-left font-medium break-words hover:text-primary hover:underline"
                            >
                                {exercise.title}
                            </button>
                            <span className="text-xs text-muted-foreground">
                                Python · {exercise.cases.length}{" "}
                                {exercise.cases.length === 1 ? "case" : "cases"}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
