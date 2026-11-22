import { useEffect, useMemo, useRef, useState } from "react"
import { CodingWorkspace } from "@/components/problem/ProblemWorkspace"
import { Button } from "@/components/ui/button"
import type { ConsoleTab, Submission, SupportedLanguage } from "@/types"
import { CustomExerciseForm } from "./CustomExerciseForm"
import {
    deleteCustomExercise,
    saveCustomExercise,
    type CustomExercise,
    type ExerciseDraft,
} from "./customExercises"
import { customProblem, pythonTestResults } from "./customWorkspaceData"
import { runPython } from "./pythonRunner"

const PYTHON: SupportedLanguage = {
    id: "python",
    name: "Python",
    monacoLang: "python",
    extension: ".py",
    version: "Pyodide",
}

export function CustomExerciseWorkspace({
    initial,
    displayNumber,
    onBack,
}: {
    initial: CustomExercise
    displayNumber: number
    onBack: () => void
}) {
    const [exercise, setExercise] = useState(initial)
    const problem = useMemo(
        () => customProblem(exercise, displayNumber),
        [exercise, displayNumber]
    )
    const [editing, setEditing] = useState(false)
    const [saveError, setSaveError] = useState("")
    const [code, setCode] = useState(exercise.starterCode)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [activeSubmission, setActiveSubmission] = useState<Submission | null>(
        null
    )
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submissionStateDetail, setDetail] = useState("")
    const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase")
    const [isConsoleOpen, setIsConsoleOpen] = useState(true)
    const activeRun = useRef<AbortController | null>(null)

    useEffect(
        () => () => {
            const run = activeRun.current
            activeRun.current = null
            run?.abort()
        },
        []
    )

    function save(draft: ExerciseDraft) {
        try {
            const saved = saveCustomExercise(draft, exercise.id).exercise
            setCode((previous) =>
                previous === exercise.starterCode ? saved.starterCode : previous
            )
            setExercise(saved)
            setActiveSubmission(null)
            setConsoleTab("testcase")
            setDetail("")
            setEditing(false)
        } catch {
            setSaveError(
                "Could not save this exercise. Check that browser storage is available."
            )
        }
    }

    function remove() {
        if (
            !window.confirm(
                `Delete “${exercise.title}”? This cannot be undone.`
            )
        )
            return
        try {
            deleteCustomExercise(exercise.id)
        } catch {
            setSaveError(
                "Could not delete this exercise. Check that browser storage is available."
            )
            return
        }
        onBack()
    }

    async function submitCode() {
        if (activeRun.current) return
        const controller = new AbortController()
        activeRun.current = controller
        setActiveSubmission(null)
        setConsoleTab("submission")
        setIsConsoleOpen(true)
        setIsSubmitting(true)
        setDetail("Loading Python…")

        const submission: Submission = {
            id: window.crypto.getRandomValues(new Uint32Array(2)).join("-"),
            problemId: problem.id,
            problemTitle: problem.title,
            language: PYTHON.name,
            code,
            status: "Runtime Error",
            timestamp: new Date().toLocaleTimeString(),
            testsPassed: 0,
            totalTests: exercise.cases.length,
        }
        try {
            const output = await runPython(
                code,
                exercise,
                controller.signal,
                () => setDetail("Running test cases…")
            )
            submission.testResults = pythonTestResults(exercise, output)
            submission.testsPassed = submission.testResults.filter(
                ({ passed }) => passed
            ).length
            submission.status =
                submission.testsPassed === submission.totalTests
                    ? "Accepted"
                    : output.some(({ error }) => error)
                      ? "Runtime Error"
                      : "Wrong Answer"
        } catch (error) {
            if (activeRun.current !== controller) return
            if (controller.signal.aborted) {
                activeRun.current = null
                setIsSubmitting(false)
                setDetail("Run stopped.")
                return
            }
            if (
                error instanceof DOMException &&
                error.name === "TimeoutError"
            ) {
                submission.status = "Time Limit Exceeded"
            }
            submission.compileError =
                error instanceof Error ? error.message : "Python run failed."
        }
        if (activeRun.current !== controller) return
        activeRun.current = null
        setIsSubmitting(false)
        setDetail("")
        setSubmissions((previous) => [submission, ...previous])
        setActiveSubmission(submission)
    }

    if (editing) {
        return (
            <section className="collection-page">
                <div className="collection-inner space-y-4">
                    {saveError && (
                        <p role="alert" className="text-sm text-destructive">
                            {saveError}
                        </p>
                    )}
                    <CustomExerciseForm
                        initial={exercise}
                        onSave={save}
                        onCancel={() => setEditing(false)}
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={remove}
                    >
                        Delete exercise
                    </Button>
                </div>
            </section>
        )
    }

    return (
        <CodingWorkspace
            problem={problem}
            localRun={{
                language: PYTHON,
                onStop: () => activeRun.current?.abort(),
            }}
            headerActions={
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={onBack}>
                        Back to custom exercises
                    </Button>
                    <Button
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => {
                            setSaveError("")
                            setEditing(true)
                        }}
                    >
                        Edit exercise
                    </Button>
                </div>
            }
            workspace={{
                code,
                setCode,
                resetCode: () => setCode(exercise.starterCode),
                isSubmitting,
                submissionStateDetail,
                submissions,
                activeSubmission,
                selectSubmission: (id) =>
                    setActiveSubmission(
                        submissions.find((item) => item.id === id) ?? null
                    ),
                consoleTab,
                setConsoleTab,
                isConsoleOpen,
                setIsConsoleOpen,
                submitCode,
            }}
        />
    )
}
