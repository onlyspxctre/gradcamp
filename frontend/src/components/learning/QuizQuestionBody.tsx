import { memo, type Dispatch, type Ref } from "react"
import { CheckCircle2, CircleHelp } from "lucide-react"
import {
    formatAddress,
    gradePointerAnswer,
    type PointerQuestion,
    type QuizResponse,
} from "@/data/pointers"
import type { LearningAction, QuestionProgress } from "@/lib/learningProgress"
import { CodeTrace } from "./CodeTrace"
import { MemoryDiagram } from "./MemoryDiagram"

// Reserve both successful and unsuccessful feedback before the first submission.
// All messages come from the grader so copy changes cannot invalidate a pixel height.
function feedbackMessages(question: PointerQuestion): string[] {
    const candidates: QuizResponse[] = [{}, { choice: "__incorrect__" }]
    if (question.kind !== "choice") {
        const target = question.kind === "memory" ? question.targetIndex : 0
        candidates.push({
            cellIndex: target,
            value: String(question.answer + 1),
        })
        if (question.kind === "memory")
            candidates.push({
                cellIndex: (target + 1) % question.cells.length,
                value: String(question.answer),
            })
    }
    return [
        ...new Set([
            question.explanation,
            ...candidates.map(
                (response) => gradePointerAnswer(question, response).feedback
            ),
        ]),
    ]
}

function QuestionFeedback({
    question,
    answer,
    active,
}: {
    question: PointerQuestion
    answer: QuestionProgress
    active: boolean
}) {
    const result = gradePointerAnswer(question, answer.response)
    const messages = [
        ...new Set([...feedbackMessages(question), result.feedback]),
    ]
    return (
        <div
            className="grid min-w-0"
            aria-live={active ? "polite" : "off"}
            aria-atomic="true"
        >
            <div
                aria-hidden={answer.checked}
                inert={answer.checked}
                className={`col-start-1 row-start-1 min-w-0 rounded-lg border border-border bg-muted/25 p-4 ${answer.checked ? "invisible" : ""}`}
            >
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Feedback
                </p>
                <p className="text-xs leading-6 text-muted-foreground">
                    Submit your answer to see the explanation. Incorrect answers
                    can be retried.
                </p>
            </div>
            {messages.map((message) => {
                const visible = answer.checked && message === result.feedback
                const success = message === question.explanation
                return (
                    <div
                        key={message}
                        role={active && visible ? "status" : undefined}
                        aria-hidden={!visible}
                        inert={!visible}
                        className={`col-start-1 row-start-1 min-w-0 rounded-lg border p-4 ${success ? "border-success/25 bg-success/5" : "border-warning/25 bg-warning/5"} ${visible ? "" : "invisible"}`}
                    >
                        <p
                            className={`mb-2 flex items-center gap-2 text-xs font-medium ${success ? "text-success" : "text-warning"}`}
                        >
                            {success ? (
                                <CheckCircle2 className="size-4 shrink-0" />
                            ) : (
                                <CircleHelp className="size-4 shrink-0" />
                            )}
                            {success ? "Correct" : "Not quite — try again"}
                        </p>
                        <p className="text-xs leading-6 text-foreground/85">
                            {message}
                        </p>
                    </div>
                )
            })}
        </div>
    )
}

interface QuizQuestionBodyProps {
    question: PointerQuestion
    answer: QuestionProgress
    active: boolean
    headingRef?: Ref<HTMLHeadingElement>
    dispatch: Dispatch<LearningAction>
}

// Inactive questions still size the shared grid, but are inert, inaccessible, and
// disabled. Memoization avoids re-rendering them while the active slider moves.
export const QuizQuestionBody = memo(function QuizQuestionBody({
    question,
    answer,
    active,
    headingRef,
    dispatch,
}: QuizQuestionBodyProps) {
    const correct =
        answer.checked && gradePointerAnswer(question, answer.response).correct
    const disabled = !active || correct
    const selectedIndex = answer.response.cellIndex ?? 0
    const update = (response: QuizResponse) =>
        dispatch({ type: "quiz-response", id: question.id, response })
    return (
        <div
            aria-hidden={!active}
            inert={!active}
            className={`col-start-1 row-start-1 grid min-w-0 gap-7 p-5 md:p-7 xl:grid-cols-2 ${active ? "" : "invisible"}`}
        >
            <div className="min-w-0 space-y-5">
                <div>
                    <p className="eyebrow mb-3">{question.concept}</p>
                    <h2
                        ref={headingRef}
                        tabIndex={-1}
                        id={active ? "quiz-question-heading" : undefined}
                        className="editorial-title text-3xl"
                    >
                        {question.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                        {question.prompt}
                    </p>
                </div>
                <CodeTrace
                    lines={question.code}
                    activeLine={correct ? question.code.length - 1 : undefined}
                />
                {question.kind === "choice" ? (
                    <fieldset disabled={disabled} className="space-y-2">
                        <legend className="mb-3 text-xs font-medium">
                            Choose one answer
                        </legend>
                        {question.choices.map((choice) => (
                            <label
                                key={choice.id}
                                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-xs transition-colors has-disabled:cursor-default ${answer.response.choice === choice.id ? "border-primary/45 bg-primary/5" : "border-border hover:bg-muted/40"}`}
                            >
                                <input
                                    type="radio"
                                    name={`answer-${question.id}`}
                                    value={choice.id}
                                    checked={
                                        answer.response.choice === choice.id
                                    }
                                    onChange={() =>
                                        update({ choice: choice.id })
                                    }
                                    className="mt-0.5 accent-primary"
                                />
                                <span className="min-w-0 font-mono leading-6 break-words">
                                    {choice.label}
                                </span>
                            </label>
                        ))}
                    </fieldset>
                ) : (
                    <div className="space-y-2">
                        <label
                            htmlFor={`value-${question.id}`}
                            className="block text-xs font-medium"
                        >
                            {question.valueLabel}
                        </label>
                        <input
                            id={`value-${question.id}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={100}
                            autoComplete="off"
                            value={answer.response.value ?? ""}
                            disabled={disabled}
                            onChange={(event) =>
                                update({ value: event.target.value })
                            }
                            placeholder="Enter an integer"
                            className="h-10 w-full rounded-md border border-input bg-card px-3 font-mono text-sm placeholder:text-xs placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-70"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Enter the stored integer, not its address.
                        </p>
                    </div>
                )}
            </div>
            <div className="min-w-0 space-y-4">
                {question.kind === "memory" ? (
                    <>
                        <MemoryDiagram
                            label="Your pointer position"
                            cells={question.cells}
                            pointer={selectedIndex}
                            onSelect={(index) => update({ cellIndex: index })}
                            disabled={disabled}
                        />
                        <div className="rounded-lg border border-border bg-secondary/25 p-4">
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <label
                                    htmlFor={`pointer-${question.id}`}
                                    className="text-xs font-medium"
                                >
                                    Pointer address
                                </label>
                                <output
                                    htmlFor={`pointer-${question.id}`}
                                    className="font-mono text-xs text-primary"
                                >
                                    {formatAddress(
                                        question.cells[selectedIndex].address
                                    )}
                                </output>
                            </div>
                            <input
                                id={`pointer-${question.id}`}
                                type="range"
                                min={0}
                                max={question.cells.length - 1}
                                step={1}
                                value={selectedIndex}
                                disabled={disabled}
                                aria-valuetext={formatAddress(
                                    question.cells[selectedIndex].address
                                )}
                                onChange={(event) =>
                                    update({
                                        cellIndex: Number(event.target.value),
                                    })
                                }
                                className="h-5 w-full accent-primary"
                            />
                            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
                                <span>
                                    {formatAddress(question.cells[0].address)}
                                </span>
                                <span>
                                    {formatAddress(
                                        question.cells[
                                            question.cells.length - 1
                                        ].address
                                    )}
                                </span>
                            </div>
                            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                                Drag the slider, use its arrow keys, or select
                                an address in the table. Each step moves one int
                                element.
                            </p>
                        </div>
                    </>
                ) : question.kind === "value" ? (
                    <MemoryDiagram
                        cells={question.cells.map((cell, index) =>
                            correct && index === question.pointerIndex
                                ? { ...cell, value: question.answer }
                                : cell
                        )}
                        pointer={question.pointerIndex}
                        label={correct ? "After line 3" : "Before line 3"}
                    />
                ) : question.illustration ? (
                    <MemoryDiagram
                        cells={
                            correct && question.illustration.after
                                ? question.illustration.after.cells
                                : question.illustration.cells
                        }
                        pointer={
                            correct && question.illustration.after
                                ? question.illustration.after.pointer
                                : question.illustration.pointer
                        }
                        label={correct ? "After line 4" : "After line 2"}
                    />
                ) : (
                    <div className="rounded-lg border border-border bg-secondary/25 p-5">
                        <CircleHelp className="mb-4 size-5 text-primary" />
                        <h3 className="font-heading text-xl">
                            Trace the expressions
                        </h3>
                        <ol className="mt-4 list-inside list-decimal space-y-3 text-xs leading-6 text-muted-foreground">
                            <li>Identify the address stored in p.</li>
                            <li>
                                Check whether the expression uses p, &p, or *p.
                            </li>
                            <li>
                                Only dereference a pointer to a valid object.
                            </li>
                        </ol>
                    </div>
                )}
                <QuestionFeedback
                    question={question}
                    answer={answer}
                    active={active}
                />
            </div>
        </div>
    )
})
