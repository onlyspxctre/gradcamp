import { useState } from "react"
import type { ActiveNavTab, Assignment } from "@/types"
import { MOCK_PROBLEMS } from "@/data/mockProblems"
import { ASSIGNMENTS } from "@/data/assignments"
import { LearningProvider } from "@/context/LearningContext"
import { PointersAssignmentView } from "@/components/learning/PointersAssignmentView"
import { Navbar } from "@/components/layout/Navbar"
import { ProblemWorkspace } from "@/components/problem/ProblemWorkspace"
import { ProblemListView } from "@/components/catalog/ProblemListView"
import { GlobalSubmissionsView } from "@/components/submissions/GlobalSubmissionsView"
import { WorkspaceProvider, useWorkspace } from "@/context/WorkspaceContext"

function AppContent() {
    const [activeNavTab, setActiveNavTab] = useState<ActiveNavTab>("workspace")
    const { setCurrentProblem, submissions } = useWorkspace()
    const [activeAssignment, setActiveAssignment] = useState<Assignment>(
        MOCK_PROBLEMS[0]
    )

    const handleSelectProblem = (assignment: Assignment) => {
        setActiveAssignment(assignment)
        if (assignment.kind === "code") setCurrentProblem(assignment)
        setActiveNavTab("workspace")
    }

    return (
        <div className="app-shell flex h-dvh w-full flex-col overflow-hidden font-sans text-foreground">
            <a
                href="#main-content"
                className="sr-only z-50 rounded-md bg-card px-4 py-2 text-sm text-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
                Skip to content
            </a>
            {/* Top Navbar */}
            <Navbar activeTab={activeNavTab} setActiveTab={setActiveNavTab} />

            {/* Main Content Area */}
            <main
                id="main-content"
                tabIndex={-1}
                className="isolate flex min-h-0 flex-1 flex-col overflow-hidden"
            >
                {activeNavTab === "workspace" &&
                    (activeAssignment.kind === "code" ? (
                        <ProblemWorkspace />
                    ) : (
                        <PointersAssignmentView
                            key={activeAssignment.id}
                            assignment={activeAssignment}
                            onSelectAssignment={handleSelectProblem}
                            onBack={() => setActiveNavTab("assignments")}
                        />
                    ))}

                {activeNavTab === "assignments" && (
                    <ProblemListView
                        problems={ASSIGNMENTS}
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
            <LearningProvider>
                <AppContent />
            </LearningProvider>
        </WorkspaceProvider>
    )
}

export default App
