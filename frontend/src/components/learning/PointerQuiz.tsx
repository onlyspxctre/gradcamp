import { useEffect, useRef } from "react"
import {
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    BookOpen,
} from "lucide-react"
import { POINTER_QUESTIONS, gradePointerAnswer } from "@/data/pointers"
import { useLearning } from "@/context/LearningContext"
import {
    initialQuestionProgress,
    isQuizComplete,
    quizCorrectCount,
} from "@/lib/learningProgress"
import { Button } from "@/components/ui/button"
import { QuizQuestionBody } from "./QuizQuestionBody"

const EMPTY_ANSWER = initialQuestionProgress()
const ACTION_CLASS =
    "col-start-1 row-start-1 h-auto min-h-8 w-full min-w-0 py-1 whitespace-normal"

export function PointerQuiz({
    onReviewLesson,
}: {
    onReviewLesson: (chapterId: string) => void
}) {
    const { progress, dispatch } = useLearning()
    const questionIndex = progress.quiz.question
    const showResults = progress.quiz.showResults
    const contentRef = useRef<HTMLElement>(null)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const revealQuestionRef = useRef(false)
    const previousResultsRef = useRef(showResults)
    const previousQuestionRef = useRef(questionIndex)
    useEffect(() => {
        const questionChanged = previousQuestionRef.current !== questionIndex
        previousQuestionRef.current = questionIndex
        const resultsChanged = previousResultsRef.current !== showResults
        previousResultsRef.current = showResults
        const reveal = revealQuestionRef.current || resultsChanged
        revealQuestionRef.current = false
        if (questionChanged || reveal)
            headingRef.current?.focus({ preventScroll: true })
        if (!reveal) return
        contentRef.current?.scrollIntoView({
            block: "start",
            behavior: "instant",
        })
    }, [questionIndex, showResults])

    const question = POINTER_QUESTIONS[questionIndex]
    const answer = progress.quiz.answers[question.id] ?? EMPTY_ANSWER
    const correct =
        answer.checked && gradePointerAnswer(question, answer.response).correct
    const totalCorrect = quizCorrectCount(progress)
    const complete = isQuizComplete(progress)
    const firstTryScore = POINTER_QUESTIONS.filter(
        (item) => progress.quiz.answers[item.id]?.firstTryCorrect === true
    ).length
    const go = (index: number, revealQuestion = false) => {
        revealQuestionRef.current =
            revealQuestion && (index !== questionIndex || showResults)
        dispatch({ type: "quiz-question", index })
    }
    const canSubmit =
        question.kind === "choice"
            ? Boolean(answer.response.choice)
            : /^-?\d+$/.test(answer.response.value?.trim() ?? "")
    const restart = () => {
        if (
            window.confirm(
                "Retake the quiz? This clears your saved quiz answers and first-try score. Lecture progress is kept."
            )
        ) {
            revealQuestionRef.current = questionIndex !== 0 || showResults
            dispatch({ type: "reset-quiz" })
        }
    }

    if (showResults && complete)
        return (
            <section
                ref={contentRef}
                className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-border bg-card/90"
                aria-labelledby="quiz-results-heading"
            >
                <div className="border-b border-border p-6 md:p-8">
                    <div className="mb-4 flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="size-5" />
                        Quiz completed
                    </div>
                    <h2
                        ref={headingRef}
                        tabIndex={-1}
                        id="quiz-results-heading"
                        className="editorial-title text-3xl"
                    >
                        Results
                    </h2>
                    <div className="mt-6 grid grid-cols-2 gap-5">
                        <div>
                            <p className="eyebrow">First-try score</p>
                            <p className="mt-2 font-heading text-4xl">
                                {firstTryScore}
                                <span className="text-2xl text-muted-foreground">
                                    {" "}
                                    / {POINTER_QUESTIONS.length}
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="eyebrow">Questions completed</p>
                            <p className="mt-2 font-heading text-4xl">
                                {totalCorrect}
                                <span className="text-2xl text-muted-foreground">
                                    {" "}
                                    / {POINTER_QUESTIONS.length}
                                </span>
                            </p>
                        </div>
                    </div>
                    <p className="mt-5 text-xs leading-6 text-muted-foreground">
                        The first-try score counts only answers that were
                        correct on the first submission. All questions are now
                        complete. These practice results are stored in this
                        browser, not submitted to the code judge.
                    </p>
                </div>
                <ol className="divide-y divide-border">
                    {POINTER_QUESTIONS.map((item, index) => (
                        <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 px-6 py-4"
                        >
                            <button
                                onClick={() => go(index, true)}
                                className="flex items-center gap-3 text-left text-sm hover:text-primary"
                            >
                                <Check className="size-4 shrink-0 text-success" />
                                {item.title}
                            </button>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {progress.quiz.answers[item.id].attempts === 1
                                    ? "First try"
                                    : `${progress.quiz.answers[item.id].attempts} attempts`}
                            </span>
                        </li>
                    ))}
                </ol>
                <div className="flex flex-wrap justify-between gap-3 border-t border-border p-5">
                    <Button variant="outline" onClick={restart}>
                        <RotateCcw className="size-3.5" />
                        Retake quiz
                    </Button>
                    <Button onClick={() => onReviewLesson("addresses")}>
                        <BookOpen className="size-3.5" />
                        Review lecture
                    </Button>
                </div>
            </section>
        )

    return (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
            <aside className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="eyebrow">Questions</h2>
                    <span className="font-mono text-[10px] text-muted-foreground">
                        {totalCorrect} / {POINTER_QUESTIONS.length} correct
                    </span>
                </div>
                <nav
                    className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible"
                    aria-label="Quiz questions"
                >
                    {POINTER_QUESTIONS.map((item, index) => {
                        const saved = progress.quiz.answers[item.id]
                        const passed =
                            saved?.checked &&
                            gradePointerAnswer(item, saved.response).correct
                        return (
                            <button
                                key={item.id}
                                onClick={() => go(index, true)}
                                aria-current={
                                    index === questionIndex ? "step" : undefined
                                }
                                aria-label={`Question ${index + 1}: ${item.title}${passed ? ", correct" : ""}`}
                                className={`flex shrink-0 items-center gap-3 rounded-md border px-3 py-3 text-left text-xs transition-colors ${index === questionIndex ? "border-primary/25 bg-secondary text-foreground" : "border-transparent text-muted-foreground hover:bg-secondary/50"}`}
                            >
                                <span className="flex size-5 shrink-0 items-center justify-center font-mono text-[10px]">
                                    {passed ? (
                                        <Check className="size-3.5 text-success" />
                                    ) : (
                                        String(index + 1).padStart(2, "0")
                                    )}
                                </span>
                                <span className="hidden lg:inline">
                                    {item.title}
                                </span>
                            </button>
                        )
                    })}
                </nav>
                <div className="mt-4 hidden space-y-3 lg:block">
                    <p className="text-[11px] leading-6 text-muted-foreground">
                        Submit each answer for feedback. You can retry incorrect
                        answers; the first-try score is kept separately.
                    </p>
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={restart}
                        className="text-muted-foreground"
                    >
                        <RotateCcw className="size-3" />
                        Restart quiz
                    </Button>
                </div>
            </aside>

            <section
                ref={contentRef}
                style={{ overflowAnchor: "none" }}
                className="min-w-0 overflow-hidden rounded-xl border border-border bg-card/85"
                aria-labelledby="quiz-question-heading"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-7">
                    <span className="eyebrow">
                        Question {questionIndex + 1} of{" "}
                        {POINTER_QUESTIONS.length}
                    </span>
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            type="button"
                            disabled={!complete}
                            aria-hidden={!complete}
                            tabIndex={complete ? undefined : -1}
                            onClick={() => dispatch({ type: "quiz-results" })}
                            className={`text-xs text-primary underline-offset-4 hover:underline ${complete ? "" : "invisible"}`}
                        >
                            Quiz results
                        </button>
                        <button
                            onClick={() => onReviewLesson(question.chapterId)}
                            className="flex items-center gap-1.5 text-xs text-primary underline-offset-4 hover:underline"
                        >
                            <BookOpen className="size-3.5" />
                            Review this concept
                        </button>
                    </div>
                </div>
                <form
                    onSubmit={(event) => {
                        event.preventDefault()
                        if (canSubmit && !correct)
                            dispatch({ type: "submit-answer", id: question.id })
                    }}
                >
                    {/* Share one intrinsic grid size across every question and feedback state.
                        Only the current question is visible, enabled, and accessible. */}
                    <div className="grid min-w-0">
                        {POINTER_QUESTIONS.map((item, index) => (
                            <QuizQuestionBody
                                key={item.id}
                                question={item}
                                answer={
                                    progress.quiz.answers[item.id] ??
                                    EMPTY_ANSWER
                                }
                                active={index === questionIndex}
                                headingRef={
                                    index === questionIndex
                                        ? headingRef
                                        : undefined
                                }
                                dispatch={dispatch}
                            />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 items-center gap-3 border-t border-border px-5 py-4 sm:grid-cols-[1fr_auto_1fr] md:px-7">
                        <Button
                            type="button"
                            variant="outline"
                            className="justify-self-start"
                            onClick={() => go(questionIndex - 1)}
                            disabled={questionIndex === 0}
                        >
                            <ChevronLeft className="size-3.5" />
                            Previous
                        </Button>
                        <div className="grid min-w-0 justify-self-end sm:justify-self-center">
                            <Button
                                type="button"
                                disabled
                                aria-hidden="true"
                                tabIndex={-1}
                                className={`${ACTION_CLASS} pointer-events-none invisible`}
                            >
                                Submit answer
                            </Button>
                            <Button
                                type="submit"
                                className={ACTION_CLASS}
                                disabled={!canSubmit || correct}
                            >
                                {correct ? (
                                    <>
                                        <Check className="size-3.5" />
                                        Submitted
                                    </>
                                ) : answer.attempts ? (
                                    "Submit again"
                                ) : (
                                    "Submit answer"
                                )}
                            </Button>
                        </div>
                        <div className="col-span-2 grid min-w-0 sm:col-span-1 sm:justify-self-end">
                            <Button
                                type="button"
                                disabled
                                aria-hidden="true"
                                tabIndex={-1}
                                className={`${ACTION_CLASS} pointer-events-none invisible`}
                            >
                                Review unanswered
                                <ChevronRight className="size-3.5" />
                            </Button>
                            {questionIndex < POINTER_QUESTIONS.length - 1 ? (
                                <Button
                                    type="button"
                                    className={ACTION_CLASS}
                                    variant={correct ? "default" : "ghost"}
                                    onClick={() => go(questionIndex + 1)}
                                >
                                    {correct ? "Next question" : "Skip for now"}
                                    <ChevronRight className="size-3.5" />
                                </Button>
                            ) : complete ? (
                                <Button
                                    type="button"
                                    className={ACTION_CLASS}
                                    onClick={() =>
                                        dispatch({ type: "quiz-results" })
                                    }
                                >
                                    View results
                                    <ChevronRight className="size-3.5" />
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    className={ACTION_CLASS}
                                    variant="ghost"
                                    onClick={() =>
                                        go(
                                            POINTER_QUESTIONS.findIndex(
                                                (item) => {
                                                    const saved =
                                                        progress.quiz.answers[
                                                            item.id
                                                        ]
                                                    return (
                                                        !saved?.checked ||
                                                        !gradePointerAnswer(
                                                            item,
                                                            saved.response
                                                        ).correct
                                                    )
                                                }
                                            )
                                        )
                                    }
                                >
                                    Review unanswered
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
                <p className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">
                    Practice grading runs locally. No code is executed or sent
                    to the judge.
                </p>
            </section>
        </div>
    )
}
