import { useState } from "react"
import type { ActiveNavTab, Problem } from "@/types"
import { MOCK_PROBLEMS } from "@/data/mockProblems"
import { Navbar } from "@/components/layout/Navbar"
import { ProblemWorkspace } from "@/components/problem/ProblemWorkspace"
import { ProblemListView } from "@/components/catalog/ProblemListView"
import { GlobalSubmissionsView } from "@/components/submissions/GlobalSubmissionsView"
import { WorkspaceProvider, useWorkspace } from "@/context/WorkspaceContext"

function AppContent() {
    const [activeNavTab, setActiveNavTab] = useState<ActiveNavTab>("workspace")
    const { setCurrentProblem, submissions } = useWorkspace()

    const handleSelectProblem = (problem: Problem) => {
        setCurrentProblem(problem)
        setActiveNavTab("workspace")
    }

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
            {/* Top Navbar */}
            <Navbar activeTab={activeNavTab} setActiveTab={setActiveNavTab} />

            {/* Main Content Area */}
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {activeNavTab === "workspace" && <ProblemWorkspace />}

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

export function App() {
    return (
        <WorkspaceProvider>
            <AppContent />
        </WorkspaceProvider>
    )
}

export default App
