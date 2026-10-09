import {
  Code2,
  ChevronLeft,
  ChevronRight,
  Play,
  Send,
  Sun,
  Moon,
  Flame,
  User,
  Server,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import type { ActiveNavTab, Problem } from "@/types"
import { MOCK_PROBLEMS } from "@/data/mockProblems"

interface NavbarProps {
  activeTab: ActiveNavTab
  setActiveTab: (tab: ActiveNavTab) => void
  currentProblem: Problem
  setCurrentProblem: (problem: Problem) => void
  onRunCode: () => void
  onSubmitCode: () => void
  isRunning: boolean
  isSubmitting: boolean
}

export function Navbar({
  activeTab,
  setActiveTab,
  currentProblem,
  setCurrentProblem,
  onRunCode,
  onSubmitCode,
  isRunning,
  isSubmitting,
}: NavbarProps) {
  const { theme, setTheme } = useTheme()

  const currentIndex = MOCK_PROBLEMS.findIndex(
    (p) => p.id === currentProblem.id
  )
  const prevProblem = currentIndex > 0 ? MOCK_PROBLEMS[currentIndex - 1] : null
  const nextProblem =
    currentIndex < MOCK_PROBLEMS.length - 1
      ? MOCK_PROBLEMS[currentIndex + 1]
      : null

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-13 items-center justify-between px-3 md:px-5">
        {/* Left Section: Brand & Navigation */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => setActiveTab("problems")}
            className="group flex cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-sm">
              <Code2 className="size-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-base font-bold tracking-tight">
                  Gradcamp
                </span>
                <span className="py-0.2 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                  Judge
                </span>
              </div>
              <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                MicroVM Autograder
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
            <button
              onClick={() => setActiveTab("problems")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                activeTab === "problems"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Problems
            </button>
            <button
              onClick={() => setActiveTab("solve")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                activeTab === "solve"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Solve
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                activeTab === "submissions"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Submissions
            </button>
            <button
              onClick={() => setActiveTab("contest")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                activeTab === "contest"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Contest
            </button>
            <button
              onClick={() => setActiveTab("discuss")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                activeTab === "discuss"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Discuss
            </button>
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                activeTab === "queue"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Server className="size-3.5" />
              Worker Queue
            </button>
          </nav>
        </div>

        {/* Center Section: Problem Switcher (visible on solve view) */}
        {activeTab === "solve" && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 p-0.5 px-1.5 text-xs">
            <button
              onClick={() => prevProblem && setCurrentProblem(prevProblem)}
              disabled={!prevProblem}
              className="rounded p-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              title="Previous Problem"
            >
              <ChevronLeft className="size-3.5" />
            </button>

            <select
              value={currentProblem.id}
              onChange={(e) => {
                const found = MOCK_PROBLEMS.find((p) => p.id === e.target.value)
                if (found) setCurrentProblem(found)
              }}
              className="max-w-[140px] cursor-pointer truncate bg-transparent py-1 text-xs font-medium focus:outline-none sm:max-w-[200px]"
            >
              {MOCK_PROBLEMS.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-background text-foreground"
                >
                  {p.numericId}. {p.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => nextProblem && setCurrentProblem(nextProblem)}
              disabled={!nextProblem}
              className="rounded p-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              title="Next Problem"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}

        {/* Right Section: Actions & Profile */}
        <div className="flex items-center gap-2">
          {activeTab === "solve" && (
            <div className="mr-2 hidden items-center gap-2 sm:flex">
              <Button
                variant="outline"
                size="sm"
                onClick={onRunCode}
                disabled={isRunning || isSubmitting}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Play
                  className={`size-3.5 fill-emerald-500 text-emerald-500 ${isRunning ? "animate-pulse" : ""}`}
                />
                {isRunning ? "Running..." : "Run"}
              </Button>

              <Button
                size="sm"
                onClick={onSubmitCode}
                disabled={isRunning || isSubmitting}
                className="h-8 gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Send
                  className={`size-3.5 ${isSubmitting ? "animate-bounce" : ""}`}
                />
                {isSubmitting ? "Evaluating..." : "Submit"}
              </Button>
            </div>
          )}

          {/* Daily streak */}
          <div
            className="hidden items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 lg:flex dark:text-amber-400"
            title="Daily Problem Solving Streak"
          >
            <Flame className="size-3.5 fill-amber-500" />
            <span>14</span>
          </div>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={`Toggle Theme (current: ${theme})`}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>

          {/* User profile avatar skeleton */}
          <div className="flex items-center gap-2 border-l border-border/80 pl-1">
            <button className="flex size-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary/80 to-primary text-xs font-medium text-primary-foreground shadow-xs ring-1 ring-border transition-all hover:ring-2">
              <User className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
