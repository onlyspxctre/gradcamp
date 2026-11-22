import { isPythonSignature, type PythonSignature } from "./pythonSignature"

export interface ExampleCase {
    input: string
    expectedOutput: string
}

export interface ExerciseDraft {
    title: string
    prompt: string
    starterCode: string
    functionName: string
    signature: PythonSignature
    cases: ExampleCase[]
}

export interface CustomExercise extends ExerciseDraft {
    id: string
}

const STORAGE_KEY = "gradcamp.demo.custom-exercises.v1"
export const MAX_CASES = 20
export const FUNCTION_NAME_PATTERN = /^[A-Za-z_][A-Za-z_0-9]*$/

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function isExercise(value: unknown): value is CustomExercise {
    return (
        isRecord(value) &&
        typeof value.id === "string" &&
        typeof value.title === "string" &&
        typeof value.prompt === "string" &&
        typeof value.starterCode === "string" &&
        typeof value.functionName === "string" &&
        FUNCTION_NAME_PATTERN.test(value.functionName) &&
        isPythonSignature(value.signature) &&
        Array.isArray(value.cases) &&
        value.cases.length > 0 &&
        value.cases.length <= MAX_CASES &&
        value.cases.every(
            (item: unknown) =>
                isRecord(item) &&
                typeof item.input === "string" &&
                typeof item.expectedOutput === "string"
        )
    )
}

export function loadCustomExercises(): CustomExercise[] {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    const saved: unknown = JSON.parse(raw)
    if (!Array.isArray(saved)) {
        throw new Error("Invalid saved custom exercises")
    }
    return saved.filter(isExercise)
}

export function saveCustomExercise(draft: ExerciseDraft, editingId?: string) {
    const exercises = loadCustomExercises()
    const id =
        editingId ?? window.crypto.getRandomValues(new Uint32Array(4)).join("-")
    const exercise: CustomExercise = { ...draft, id }
    if (editingId !== undefined) {
        const index = exercises.findIndex((item) => item.id === editingId)
        if (index === -1) throw new Error("Exercise no longer exists")
        exercises[index] = exercise
    } else {
        exercises.push(exercise)
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises))
    return { exercise, exercises }
}

export function deleteCustomExercise(id: string) {
    const exercises = loadCustomExercises().filter(
        (exercise) => exercise.id !== id
    )
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises))
}
