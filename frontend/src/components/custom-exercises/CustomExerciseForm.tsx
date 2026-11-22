import { useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
    FUNCTION_NAME_PATTERN,
    MAX_CASES,
    type ExerciseDraft,
} from "./customExercises"
import { FunctionSignatureFields } from "./FunctionSignatureFields"
import { validateFunctionCase, type PythonSignature } from "./pythonSignature"

const fieldClass =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"

export function CustomExerciseForm({
    initial,
    onSave,
    onCancel,
}: {
    initial: ExerciseDraft | null
    onSave: (draft: ExerciseDraft) => void
    onCancel: () => void
}) {
    const [caseIds, setCaseIds] = useState(() =>
        initial ? initial.cases.map((_, index) => index + 1) : [1]
    )
    const nextCaseId = useRef(caseIds.length + 1)
    const [error, setError] = useState("")
    const [signature, setSignature] = useState<PythonSignature>(
        () =>
            initial?.signature ?? { arguments: ["int", "int"], returns: "int" }
    )

    function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const fields = new FormData(event.currentTarget)
        const text = (name: string) => String(fields.get(name) ?? "")
        const title = text("title").trim()
        const prompt = text("prompt").trim()
        if (!title || !prompt) {
            setError("Enter a title and a problem statement.")
            return
        }
        const cases = caseIds.map((id) => ({
            input: text(`input-${id}`),
            expectedOutput: text(`output-${id}`),
        }))
        const functionName = text("functionName").trim()
        if (!FUNCTION_NAME_PATTERN.test(functionName)) {
            setError("Enter a Python function name, such as solve or add_two.")
            return
        }
        for (const [index, testCase] of cases.entries()) {
            const error = validateFunctionCase(testCase, signature)
            if (error) {
                setError(`Case ${index + 1}: ${error}`)
                return
            }
        }
        setError("")
        onSave({
            title,
            prompt,
            starterCode: text("starterCode"),
            functionName,
            signature,
            cases,
        })
    }

    return (
        <form
            onSubmit={save}
            className="space-y-5 rounded-lg border border-border bg-card/80 p-4 sm:p-6"
            aria-labelledby="custom-exercise-form-heading"
        >
            <h3
                id="custom-exercise-form-heading"
                className="font-heading text-xl"
            >
                {initial ? "Edit Python exercise" : "New Python exercise"}
            </h3>
            <label className="block text-sm font-medium">
                Exercise title
                <input
                    name="title"
                    defaultValue={initial?.title}
                    required
                    maxLength={100}
                    className={fieldClass}
                />
            </label>
            <label className="block text-sm font-medium">
                Problem statement
                <textarea
                    name="prompt"
                    defaultValue={initial?.prompt}
                    required
                    maxLength={4000}
                    rows={3}
                    className={fieldClass}
                />
            </label>
            <label className="block text-sm font-medium">
                Function name
                <input
                    name="functionName"
                    defaultValue={initial?.functionName ?? "solve"}
                    required
                    maxLength={80}
                    spellCheck={false}
                    className={`${fieldClass} font-mono`}
                />
                <span className="text-xs text-muted-foreground">
                    The grader calls this function. Other functions can be used
                    as helpers.
                </span>
            </label>
            <label className="block text-sm font-medium">
                Starter code (Python)
                <textarea
                    name="starterCode"
                    defaultValue={
                        initial?.starterCode ??
                        "def solve(a, b):\n    # TODO: Return the result.\n    pass"
                    }
                    maxLength={8000}
                    rows={5}
                    spellCheck={false}
                    className={`${fieldClass} font-mono`}
                />
            </label>
            <FunctionSignatureFields
                signature={signature}
                onChange={setSignature}
            />
            <section
                aria-labelledby="custom-test-cases-heading"
                className="space-y-3"
            >
                <h4 id="custom-test-cases-heading" className="font-medium">
                    Test cases
                </h4>
                <p className="text-xs text-muted-foreground">
                    Give each case a JSON array of positional arguments and the
                    expected return value. For example, [2, 3] passes two
                    integers, [[2, 3]] passes one list, and [] passes none. Use
                    quotes for strings and null for Python None.
                </p>
                {caseIds.map((id, index) => (
                    <fieldset
                        key={id}
                        className="min-w-0 space-y-2 rounded-md border border-border p-3"
                    >
                        <legend className="px-1 text-sm font-medium">
                            Case {index + 1}
                        </legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm">
                                Arguments (JSON array)
                                <textarea
                                    name={`input-${id}`}
                                    defaultValue={initial?.cases[id - 1]?.input}
                                    placeholder="[2, 3]"
                                    maxLength={4000}
                                    rows={3}
                                    spellCheck={false}
                                    className={`${fieldClass} font-mono`}
                                />
                            </label>
                            <label className="block text-sm">
                                Expected return (JSON)
                                <textarea
                                    name={`output-${id}`}
                                    defaultValue={
                                        initial?.cases[id - 1]?.expectedOutput
                                    }
                                    placeholder="5"
                                    maxLength={4000}
                                    rows={3}
                                    spellCheck={false}
                                    className={`${fieldClass} font-mono`}
                                />
                            </label>
                        </div>
                        {caseIds.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    setCaseIds(
                                        caseIds.filter((item) => item !== id)
                                    )
                                }
                            >
                                Remove case {index + 1}
                            </Button>
                        )}
                    </fieldset>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    disabled={caseIds.length >= MAX_CASES}
                    onClick={() =>
                        setCaseIds([...caseIds, nextCaseId.current++])
                    }
                >
                    Add test case
                </Button>
            </section>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            <div className="flex flex-wrap gap-2">
                <Button type="submit">Save exercise</Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
