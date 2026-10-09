import { useState } from "react"
import type { Problem, Difficulty, Submission } from "@/types"
import { DifficultyBadge } from "@/components/common/StatusBadges"
import {
  Search,
  CheckCircle2,
  Clock,
  Shuffle,
  Sparkles,
  Filter,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProblemListViewProps {
  problems: Problem[]
  submissions: Submission[]
  onSelectProblem: (problem: Problem) => void
}

export function ProblemListView({
  problems,
  submissions,
  onSelectProblem,
}: ProblemListViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    Difficulty | "All"
  >("All")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  // Categories
  const categories = [
    "All",
    ...Array.from(new Set(problems.map((p) => p.category))),
  ]

  // Filtering
  const filteredProblems = problems.filter((problem) => {
    const matchesSearch =
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.numericId.toString().includes(searchQuery) ||
      problem.tags.some((t) =>
        t.toLowerCase().includes(searchQuery.toLowerCase())
      )

    const matchesDiff =
      selectedDifficulty === "All" || problem.difficulty === selectedDifficulty

    const matchesCat =
      selectedCategory === "All" || problem.category === selectedCategory

    return matchesSearch && matchesDiff && matchesCat
  })

  const getProblemStatus = (problemId: string) => {
    const subs = submissions.filter((s) => s.problemId === problemId)
    if (subs.some((s) => s.status === "Accepted")) return "solved"
    if (subs.length > 0) return "attempted"
    return "todo"
  }

  const handlePickRandom = () => {
    const random = problems[Math.floor(Math.random() * problems.length)]
    onSelectProblem(random)
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 overflow-y-auto bg-background p-4 md:p-8">
      {/* Daily Challenge & Quick Start Banner */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Daily Card */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-gradient-to-r from-primary/5 via-muted/40 to-muted/20 p-5 md:col-span-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Calendar className="size-3" />
                Daily Coding Challenge
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Today
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {problems[0]?.numericId}. {problems[0]?.title}
            </h2>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {problems[0]?.description}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button
              size="sm"
              onClick={() => onSelectProblem(problems[0])}
              className="bg-primary text-xs font-semibold text-primary-foreground"
            >
              <Sparkles className="size-3.5" />
              Solve Challenge
            </Button>
            <DifficultyBadge difficulty={problems[0]?.difficulty || "Easy"} />
          </div>
        </div>

        {/* Stats Summary Card */}
        <div className="flex flex-col justify-between space-y-3 rounded-xl border border-border bg-card p-5">
          <div>
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Your Progress
            </h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground">
                {submissions.filter((s) => s.status === "Accepted").length}
              </span>
              <span className="text-xs text-muted-foreground">
                / {problems.length} solved
              </span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-border/60 pt-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Acceptance Rate</span>
              <span className="font-semibold text-foreground">100%</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Submissions</span>
              <span className="font-semibold text-foreground">
                {submissions.length}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="xs"
            onClick={handlePickRandom}
            className="mt-1 w-full gap-1.5 text-xs font-semibold"
          >
            <Shuffle className="size-3.5" />
            Pick Random Problem
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search problems, ID, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-1.5 pr-3 pl-9 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </div>

          {/* Difficulty Filter Pills */}
          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
            {(["All", "Easy", "Medium", "Hard"] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  selectedDifficulty === diff
                    ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Filter className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] transition-colors ${
                selectedCategory === cat
                  ? "bg-foreground font-semibold text-background"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Title</th>
                <th className="w-28 px-4 py-3">Difficulty</th>
                <th className="hidden w-28 px-4 py-3 md:table-cell">
                  Acceptance
                </th>
                <th className="hidden w-40 px-4 py-3 sm:table-cell">
                  Category
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredProblems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No problems found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredProblems.map((problem) => {
                  const status = getProblemStatus(problem.id)
                  return (
                    <tr
                      key={problem.id}
                      onClick={() => onSelectProblem(problem)}
                      className="group cursor-pointer transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-center">
                        {status === "solved" ? (
                          <CheckCircle2 className="inline size-4 text-emerald-500" />
                        ) : status === "attempted" ? (
                          <Clock className="inline size-4 text-amber-500" />
                        ) : (
                          <span className="inline-block size-2 rounded-full bg-border" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
                            {problem.numericId}. {problem.title}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {problem.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="py-0.2 rounded bg-muted/50 px-1.5 text-[10px] text-muted-foreground/80"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <DifficultyBadge difficulty={problem.difficulty} />
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-muted-foreground md:table-cell">
                        {problem.acceptance}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {problem.category}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
