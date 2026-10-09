import { useState } from "react"
import type { ActiveNavTab, Problem, Submission } from "@/types"
import { MOCK_PROBLEMS } from "@/data/mockProblems"
import { Navbar } from "@/components/layout/Navbar"
import { ProblemWorkspace } from "@/components/problem/ProblemWorkspace"
import { ProblemListView } from "@/components/catalog/ProblemListView"
import { GlobalSubmissionsView } from "@/components/submissions/GlobalSubmissionsView"

export function App() {
  const [activeNavTab, setActiveNavTab] = useState<ActiveNavTab>("workspace")
  const [currentProblem, setCurrentProblem] = useState<Problem>(
    MOCK_PROBLEMS[0]
  )
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const [submissions, setSubmissions] = useState<Submission[]>([])

  const handleNewSubmission = (sub: Submission) => {
    setSubmissions((prev) => [sub, ...prev])
  }

  const handleSelectProblem = (problem: Problem) => {
    setCurrentProblem(problem)
    setActiveNavTab("workspace")
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeNavTab}
        setActiveTab={setActiveNavTab}
        onRunCode={() => {
          const runBtn = document.querySelector(
            '[data-run-trigger="true"]'
          ) as HTMLButtonElement | null
          runBtn?.click()
        }}
        onSubmitCode={() => {
          const submitBtn = document.querySelector(
            '[data-submit-trigger="true"]'
          ) as HTMLButtonElement | null
          submitBtn?.click()
        }}
        isRunning={isRunning}
        isSubmitting={isSubmitting}
      />

      {/* Main Content Area */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeNavTab === "workspace" && (
          <ProblemWorkspace
            key={currentProblem.id}
            problem={currentProblem}
            submissions={submissions}
            onNewSubmission={handleNewSubmission}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        )}

        {activeNavTab === "assignments" && (
          <ProblemListView
            problems={MOCK_PROBLEMS}
            submissions={submissions}
            onSelectProblem={handleSelectProblem}
          />
        )}

        {activeNavTab === "submissions" && (
          <GlobalSubmissionsView
            submissions={submissions}
            problems={MOCK_PROBLEMS}
            onSelectProblem={handleSelectProblem}
          />
        )}
      </main>
    </div>
  )
}

export default App
