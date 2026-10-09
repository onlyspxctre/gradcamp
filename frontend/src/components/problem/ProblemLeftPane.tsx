import { useState } from "react"
import {
  FileText,
  Lightbulb,
  History,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Star,
  Share2,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  CheckCircle2,
  Clock,
} from "lucide-react"
import type { Problem, ProblemLeftTab, Submission } from "@/types"
import {
  DifficultyBadge,
  SubmissionStatusBadge,
} from "@/components/common/StatusBadges"
import { Button } from "@/components/ui/button"

interface ProblemLeftPaneProps {
  problem: Problem
  submissions: Submission[]
  activeTab: ProblemLeftTab
  setActiveTab: (tab: ProblemLeftTab) => void
  onSelectSubmission?: (sub: Submission) => void
}

export function ProblemLeftPane({
  problem,
  submissions,
  activeTab,
  setActiveTab,
  onSelectSubmission,
}: ProblemLeftPaneProps) {
  const [expandedHints, setExpandedHints] = useState<Record<number, boolean>>(
    {}
  )
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [selectedSubDetail, setSelectedSubDetail] = useState<Submission | null>(
    null
  )

  const toggleHint = (index: number) => {
    setExpandedHints((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const problemSubmissions = submissions.filter(
    (s) => s.problemId === problem.id
  )

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-border bg-background select-text">
      {/* Tab Navigation Header */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/30 px-3 py-1.5 text-xs">
        <button
          onClick={() => {
            setActiveTab("description")
            setSelectedSubDetail(null)
          }}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeTab === "description"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <FileText className="size-3.5 text-blue-500" />
          <span>Description</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("editorial")
            setSelectedSubDetail(null)
          }}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeTab === "editorial"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <Lightbulb className="size-3.5 text-amber-500" />
          <span>Editorial</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("submissions")
            setSelectedSubDetail(null)
          }}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeTab === "submissions"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <History className="size-3.5 text-emerald-500" />
          <span>Submissions</span>
          {problemSubmissions.length > 0 && (
            <span className="py-0.2 ml-0.5 rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
              {problemSubmissions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("discuss")
            setSelectedSubDetail(null)
          }}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeTab === "discuss"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <MessageSquare className="size-3.5 text-purple-500" />
          <span>Solutions</span>
        </button>
      </div>

      {/* Pane Content Area */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
        {/* TAB 1: DESCRIPTION */}
        {activeTab === "description" && (
          <div className="space-y-6">
            {/* Title & Stats */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                  {problem.numericId}. {problem.title}
                </h1>
                <DifficultyBadge difficulty={problem.difficulty} />
              </div>

              {/* Tags and metrics */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {problem.category}
                </span>
                <span>•</span>
                <span>
                  Acceptance:{" "}
                  <strong className="font-semibold text-foreground">
                    {problem.acceptance}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Submissions:{" "}
                  <strong className="font-semibold text-foreground">
                    {problem.totalSubmissions}
                  </strong>
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 border-b border-border/70 pt-1 pb-3">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                    liked
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ThumbsUp className="size-3.5" />
                  <span>{liked ? "1.3k" : "1.2k"}</span>
                </button>
                <button className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted">
                  <ThumbsDown className="size-3.5" />
                </button>
                <button
                  onClick={() => setFavorited(!favorited)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                    favorited
                      ? "fill-amber-500 font-semibold text-amber-500"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Star
                    className={`size-3.5 ${favorited ? "fill-amber-500" : ""}`}
                  />
                  <span>{favorited ? "Saved" : "Favorite"}</span>
                </button>
                <button className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted">
                  <Share2 className="size-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Description Text */}
            <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
              {problem.description.split("\n\n").map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Examples Section */}
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-bold tracking-tight tracking-wider text-foreground text-muted-foreground uppercase">
                Examples
              </h2>
              {problem.examples.map((example) => (
                <div
                  key={example.id}
                  className="space-y-2 rounded-lg border border-border bg-muted/20 p-3.5 font-mono text-xs"
                >
                  <div className="flex items-center justify-between font-sans text-xs font-semibold text-foreground">
                    <span>Example {example.id}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                      <span className="min-w-16 text-muted-foreground">
                        Input:
                      </span>
                      <span className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground">
                        {example.input}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                      <span className="min-w-16 text-muted-foreground">
                        Output:
                      </span>
                      <span className="rounded bg-muted/60 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        {example.output}
                      </span>
                    </div>
                    {example.explanation && (
                      <div className="flex flex-col gap-1 pt-1 font-sans text-xs text-muted-foreground sm:flex-row sm:items-start">
                        <span className="min-w-16 font-mono">Explanation:</span>
                        <span>{example.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Constraints
              </h2>
              <ul className="list-inside list-disc space-y-1.5 font-mono text-xs text-foreground/90">
                {problem.constraints.map((constraint, idx) => (
                  <li key={idx} className="leading-normal">
                    <span className="rounded bg-muted/50 px-1.5 py-0.5">
                      {constraint}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Topic Tags */}
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Related Topics
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map((tag) => (
                  <span
                    key={tag}
                    className="cursor-pointer rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Hints Accordion */}
            {problem.hints && problem.hints.length > 0 && (
              <div className="space-y-2 border-t border-border/70 pt-2">
                <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Hints
                </h2>
                <div className="space-y-2">
                  {problem.hints.map((hint, idx) => {
                    const isOpen = expandedHints[idx]
                    return (
                      <div
                        key={idx}
                        className="overflow-hidden rounded-lg border border-border bg-card text-xs"
                      >
                        <button
                          onClick={() => toggleHint(idx)}
                          className="flex w-full items-center justify-between p-3 text-left font-medium text-foreground transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-2">
                            <Lightbulb className="size-3.5 text-amber-500" />
                            <span>Hint {idx + 1}</span>
                          </div>
                          {isOpen ? (
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="border-t border-border/40 px-3 pt-1 pb-3 leading-relaxed text-muted-foreground">
                            {hint}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EDITORIAL */}
        {activeTab === "editorial" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-600 dark:text-amber-400">
                  Official Editorial
                </span>
                <span className="text-xs text-muted-foreground">
                  Gradcamp Staff Solution
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                {problem.solutionExplanation?.approach ||
                  "Optimized Approach Analysis"}
              </h2>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <h3 className="font-semibold text-foreground">
                Intuition & Mechanics
              </h3>
              <p>
                When tackling this problem, notice the performance constraints.
                A naive approach iterates through the entire space multiple
                times, leading to quadratic time complexity.
              </p>
              <p>
                By maintaining a cache / hash indexing structure, we can achieve
                linear time lookup $O(1)$, cutting overall complexity to $O(N)$
                and maximizing cache locality for modern CPU pipelines.
              </p>
            </div>

            {/* Complexity Analysis Cards */}
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Clock className="size-3.5 text-blue-500" />
                  <span>Time Complexity</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {problem.solutionExplanation?.complexity.time ||
                    "O(N) - Single linear pass"}
                </p>
              </div>

              <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Cpu className="size-3.5 text-purple-500" />
                  <span>Space Complexity</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {problem.solutionExplanation?.complexity.space ||
                    "O(N) - Storage for lookup table"}
                </p>
              </div>
            </div>

            {/* Code Snippet */}
            {problem.solutionExplanation?.codeSnippet && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Algorithmic Core
                </h3>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs text-foreground">
                  {problem.solutionExplanation.codeSnippet}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUBMISSIONS */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Submission History
                </h2>
                <p className="text-xs text-muted-foreground">
                  Evaluated inside Gradcamp isolated sandboxes
                </p>
              </div>
            </div>

            {selectedSubDetail ? (
              /* Detailed view for a single submission */
              <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-xs">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <SubmissionStatusBadge status={selectedSubDetail.status} />
                    <span className="font-semibold text-foreground">
                      {selectedSubDetail.language}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedSubDetail(null)}
                  >
                    Back to list
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded bg-muted/30 p-3">
                    <span className="block text-[11px] text-muted-foreground">
                      Runtime
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {selectedSubDetail.runtimeMs ?? "--"} ms
                    </span>
                    {selectedSubDetail.runtimePercentile && (
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                        Beats {selectedSubDetail.runtimePercentile}%
                      </span>
                    )}
                  </div>
                  <div className="rounded bg-muted/30 p-3">
                    <span className="block text-[11px] text-muted-foreground">
                      Memory
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {selectedSubDetail.memoryMb ?? "--"} MB
                    </span>
                    {selectedSubDetail.memoryPercentile && (
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                        Beats {selectedSubDetail.memoryPercentile}%
                      </span>
                    )}
                  </div>
                </div>

                {selectedSubDetail.compileError && (
                  <div className="rounded border border-destructive/20 bg-destructive/10 p-3 font-mono text-[11px] whitespace-pre-wrap text-destructive">
                    {selectedSubDetail.compileError}
                  </div>
                )}

                {selectedSubDetail.testResults && (
                  <div className="space-y-2">
                    <span className="block font-bold text-foreground">
                      Test Suite Details ({selectedSubDetail.testsPassed}/
                      {selectedSubDetail.totalTests} passed)
                    </span>
                    <div className="space-y-1.5">
                      {selectedSubDetail.testResults.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded border border-border/60 bg-muted/20 p-2"
                        >
                          <div className="flex items-center gap-2">
                            {t.passed ? (
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                            ) : (
                              <Clock className="size-3.5 text-rose-500" />
                            )}
                            <span className="font-medium text-foreground">
                              {t.name}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {t.durationMs
                              ? `${t.durationMs}ms`
                              : t.passed
                                ? "PASSED"
                                : "FAILED"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code snapshot */}
                <div className="space-y-1.5">
                  <span className="block font-bold text-foreground">
                    Submitted Code:
                  </span>
                  <pre className="max-h-48 overflow-y-auto rounded bg-muted/50 p-2.5 font-mono text-[11px]">
                    {selectedSubDetail.code}
                  </pre>
                </div>
              </div>
            ) : problemSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center">
                <Code2 className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  No submissions yet
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Write your solution in the editor on the right and click
                  "Submit" to test your code.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {problemSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubDetail(sub)
                      onSelectSubmission?.(sub)
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-3 text-xs transition-colors hover:bg-muted/30"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SubmissionStatusBadge status={sub.status} />
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {sub.language}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{sub.timestamp}</span>
                        {sub.runtimeMs !== undefined && (
                          <span>
                            Runtime:{" "}
                            <strong className="text-foreground">
                              {sub.runtimeMs} ms
                            </strong>
                          </span>
                        )}
                        {sub.memoryMb !== undefined && (
                          <span>
                            Memory:{" "}
                            <strong className="text-foreground">
                              {sub.memoryMb} MB
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-[11px]">
                        {sub.testsPassed}/{sub.totalTests} tests
                      </span>
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DISCUSS */}
        {activeTab === "discuss" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Community Solutions
                </h2>
                <p className="text-xs text-muted-foreground">
                  Top community writeups and optimal implementations
                </p>
              </div>
              <Button size="xs" variant="outline">
                Share Solution
              </Button>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  title: `[C / Posix] Zero-allocation solution with custom hash table`,
                  author: "alex_c_dev",
                  votes: 482,
                  comments: 34,
                  tag: "C",
                  time: "2 days ago",
                },
                {
                  title: `[Python 3] Clean one-pass dictionary approach with O(1) space tricks`,
                  author: "algorithm_wizard",
                  votes: 1209,
                  comments: 89,
                  tag: "Python",
                  time: "1 week ago",
                },
                {
                  title: `Comprehensive visualization of pointer manipulation & cache lines`,
                  author: "systems_geek",
                  votes: 350,
                  comments: 18,
                  tag: "Editorial",
                  time: "2 weeks ago",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="cursor-pointer space-y-1.5 rounded-lg border border-border bg-card p-3 text-xs transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground hover:underline">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="py-0.2 rounded bg-muted px-1.5 font-mono text-[10px]">
                      {item.tag}
                    </span>
                    <span>by {item.author}</span>
                    <span>•</span>
                    <span>👍 {item.votes}</span>
                    <span>•</span>
                    <span>💬 {item.comments}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
