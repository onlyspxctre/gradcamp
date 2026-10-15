import { Code2, Play, Send, Sun, Moon, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useWorkspace } from "@/context/WorkspaceContext"
import type { ActiveNavTab } from "@/types"

interface NavbarProps {
  activeTab: ActiveNavTab
  setActiveTab: (tab: ActiveNavTab) => void
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { theme, setTheme } = useTheme()
  const { runCode, submitCode, isRunning, isSubmitting } = useWorkspace()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-13 items-center justify-between px-4 md:px-6">
        {/* Left Section: Clean Brand & Navigation */}
        <div className="flex items-center gap-8">
          <div
            onClick={() => setActiveTab("workspace")}
            className="group flex cursor-pointer items-center gap-2.5 transition-opacity select-none hover:opacity-90"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-xs">
              <Code2 className="size-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Gradcamp
            </span>
          </div>

          <nav className="flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab("workspace")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                activeTab === "workspace"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Workspace
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                activeTab === "assignments"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Assignments
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
          </nav>
        </div>

        {/* Right Section: Actions & Profile */}
        <div className="flex items-center gap-2.5">
          {activeTab === "workspace" && (
            <div className="mr-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runCode}
                disabled={isRunning || isSubmitting}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Play
                  className={`size-3 fill-emerald-500 text-emerald-500 ${isRunning ? "animate-pulse" : ""}`}
                />
                {isRunning ? "Running..." : "Run"}
              </Button>

              <Button
                size="sm"
                onClick={submitCode}
                disabled={isRunning || isSubmitting}
                className="h-8 gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Send
                  className={`size-3 ${isSubmitting ? "animate-bounce" : ""}`}
                />
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          )}

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

          {/* User profile avatar */}
          <div className="flex items-center border-l border-border/80 pl-1">
            <button className="flex size-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary/80 to-primary text-xs font-medium text-primary-foreground shadow-xs ring-1 ring-border transition-all hover:ring-2">
              <User className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
