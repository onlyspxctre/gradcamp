import type { ActiveNavTab, Assignment } from "@/types"
import { MOCK_PROBLEMS } from "@/data/mockProblems"
import { ASSIGNMENTS } from "@/data/assignments"
import { LearningProvider } from "@/context/LearningContext"
import { LearningAssignmentPage } from "@/components/learning/LearningAssignmentPage"
import { learningProgressCodecs } from "@/components/learning/learningActivities"
import { Navbar } from "@/components/layout/Navbar"
import { ProblemWorkspace } from "@/components/problem/ProblemWorkspace"
import { ProblemListView } from "@/components/catalog/ProblemListView"
import { GlobalSubmissionsView } from "@/components/submissions/GlobalSubmissionsView"
import { WorkspaceProvider, useWorkspace } from "@/context/WorkspaceContext"
import { AppLink } from "@/components/common/AppLink"
import { assignmentPath, useAppNavigation } from "@/lib/appNavigation"

function AppContent({
    route,
    workspaceAssignment,
    navigate,
}: ReturnType<typeof useAppNavigation>) {
    const { submissions } = useWorkspace()
    const tabPaths: Record<ActiveNavTab, string> = {
        workspace: assignmentPath(workspaceAssignment),
        assignments: "/assignments",
        submissions: "/submissions",
    }
    const handleSelectAssignment = (assignment: Assignment) =>
        navigate(assignmentPath(assignment))

    return (
        <div className="app-shell flex h-dvh w-full flex-col overflow-hidden font-sans text-foreground">
            <a
                href="#main-content"
                className="sr-only z-50 rounded-md bg-card px-4 py-2 text-sm text-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
                Skip to content
            </a>
            {/* Top Navbar */}
            <Navbar
                activeTab={route.page === "not-found" ? undefined : route.page}
                tabPaths={tabPaths}
                navigate={navigate}
            />

            {/* Main Content Area */}
            <main
                id="main-content"
                tabIndex={-1}
                className="isolate flex min-h-0 flex-1 flex-col overflow-hidden"
            >
                {route.page === "workspace" &&
                    (route.assignment.kind === "code" ? (
                        <ProblemWorkspace
                            key={route.assignment.id}
                            problem={route.assignment}
                        />
                    ) : (
                        <LearningAssignmentPage
                            key={route.assignment.id}
                            assignment={route.assignment}
                            assignments={ASSIGNMENTS}
                            onSelectAssignment={handleSelectAssignment}
                            onBack={() => navigate(tabPaths.assignments)}
                        />
                    ))}

                {route.page === "assignments" && (
                    <ProblemListView
                        problems={ASSIGNMENTS}
                        submissions={submissions}
                        navigate={navigate}
                    />
                )}

                {route.page === "submissions" && (
                    <GlobalSubmissionsView
                        submissions={submissions}
                        problems={MOCK_PROBLEMS}
                        onSelectProblem={handleSelectAssignment}
                    />
                )}

                {route.page === "not-found" && (
                    <section className="collection-page">
                        <div className="collection-inner">
                            <h1 className="editorial-title text-4xl">
                                Page not found
                            </h1>
                            <AppLink
                                href={tabPaths.assignments}
                                navigate={navigate}
                                className="mt-4 inline-block text-primary underline"
                            >
                                Browse assignments
                            </AppLink>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}

export function App() {
    const navigation = useAppNavigation()
    return (
        <WorkspaceProvider assignment={navigation.workspaceAssignment}>
            <LearningProvider codecs={learningProgressCodecs}>
                <AppContent {...navigation} />
            </LearningProvider>
        </WorkspaceProvider>
    )
}

export default App
