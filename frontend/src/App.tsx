import { useState } from "react"
import type { ActiveNavTab, Problem, Submission } from "@/types"
import { MOCK_PROBLEMS } from "@/data/mockProblems"
import { Navbar } from "@/components/layout/Navbar"
import { ProblemWorkspace } from "@/components/problem/ProblemWorkspace"
import { ProblemListView } from "@/components/catalog/ProblemListView"
import { GlobalSubmissionsView } from "@/components/submissions/GlobalSubmissionsView"
import { ContestSkeletonView } from "@/components/contest/ContestSkeletonView"
import { DiscussSkeletonView } from "@/components/discuss/DiscussSkeletonView"
import { QueueMonitorView } from "@/components/queue/QueueMonitorView"

export function App() {
  const [activeNavTab, setActiveNavTab] = useState<ActiveNavTab>("solve")
  const [currentProblem, setCurrentProblem] = useState<Problem>(
    MOCK_PROBLEMS[0]
  )
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Pre-seed some realistic submissions so the submission history looks alive
  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: "sub-init-1",
      problemId: "1",
      problemTitle: "Two Sum",
      language: "C (GCC 13.2)",
      code: `int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    *returnSize = 2;
    int* res = malloc(2 * sizeof(int));
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[i] + nums[j] == target) {
                res[0] = i; res[1] = j;
                return res;
            }
        }
    }
    return res;
}`,
      status: "Accepted",
      timestamp: "10:42:15",
      runtimeMs: 4,
      runtimePercentile: 91,
      memoryMb: 8.2,
      memoryPercentile: 84,
      testsPassed: 3,
      totalTests: 3,
      testResults: [
        { name: "Test 1: Standard input", passed: true, durationMs: 1 },
        { name: "Test 2: Large array boundaries", passed: true, durationMs: 2 },
        {
          name: "Test 3: Negative numbers & duplicates",
          passed: true,
          durationMs: 1,
        },
      ],
    },
    {
      id: "sub-init-2",
      problemId: "6",
      problemTitle: "Parallel Matrix Multiplication in C",
      language: "C (GCC 13.2)",
      code: `#include <pthread.h>\n// Parallel matrix multiply baseline`,
      status: "Accepted",
      timestamp: "09:15:02",
      runtimeMs: 28,
      runtimePercentile: 96,
      memoryMb: 14.1,
      memoryPercentile: 88,
      testsPassed: 3,
      totalTests: 3,
      testResults: [
        { name: "Dimension N=64", passed: true, durationMs: 4 },
        { name: "Dimension N=256", passed: true, durationMs: 11 },
        { name: "Dimension N=1024 (Stress)", passed: true, durationMs: 13 },
      ],
    },
  ])

  const handleNewSubmission = (sub: Submission) => {
    setSubmissions((prev) => [sub, ...prev])
  }

  const handleSelectProblem = (problem: Problem) => {
    setCurrentProblem(problem)
    setActiveNavTab("solve")
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeNavTab}
        setActiveTab={setActiveNavTab}
        currentProblem={currentProblem}
        setCurrentProblem={setCurrentProblem}
        onRunCode={() => {
          // Triggered via Navbar action button
          const runBtn = document.querySelector(
            '[data-run-trigger="true"]'
          ) as HTMLButtonElement | null
          runBtn?.click()
        }}
        onSubmitCode={() => {
          // Triggered via Navbar action button
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
        {activeNavTab === "solve" && (
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

        {activeNavTab === "problems" && (
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

        {activeNavTab === "contest" && <ContestSkeletonView />}

        {activeNavTab === "discuss" && <DiscussSkeletonView />}

        {activeNavTab === "queue" && <QueueMonitorView />}
      </main>
    </div>
  )
}

export default App
