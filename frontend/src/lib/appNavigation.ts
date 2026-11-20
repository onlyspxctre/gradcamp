import { useCallback, useEffect, useState } from "react"
import { ASSIGNMENTS } from "@/data/assignments"
import { DEMO_PROBLEM } from "@/data/mockProblems"
import type { Assignment } from "@/types"

type AppRoute =
    | { page: "workspace"; assignment: Assignment }
    | { page: "assignments" | "submissions" | "not-found" }

export function assignmentPath(assignment: Assignment): string {
    return `/assignments/${assignment.slug}`
}

function readRoute(pathname: string): AppRoute {
    if (pathname === "/") {
        return { page: "workspace", assignment: DEMO_PROBLEM }
    }

    const path = pathname.replace(/\/$/, "")
    if (path === "/assignments") return { page: "assignments" }
    if (path === "/submissions") return { page: "submissions" }

    const assignment = ASSIGNMENTS.find((item) => assignmentPath(item) === path)
    return assignment ? { page: "workspace", assignment } : { page: "not-found" }
}

export function useAppNavigation() {
    const [{ route, workspaceAssignment }, setLocation] = useState(() => {
        const route = readRoute(window.location.pathname)
        return {
            route,
            workspaceAssignment:
                route.page === "workspace" ? route.assignment : DEMO_PROBLEM,
        }
    })

    const syncLocation = useCallback(() => {
        const route = readRoute(window.location.pathname)
        setLocation((previous) => ({
            route,
            // The Workspace link returns to the last assignment when off the workspace.
            workspaceAssignment:
                route.page === "workspace"
                    ? route.assignment
                    : previous.workspaceAssignment,
        }))
    }, [])

    useEffect(() => {
        window.addEventListener("popstate", syncLocation)
        return () => window.removeEventListener("popstate", syncLocation)
    }, [syncLocation])

    function navigate(path: string) {
        const current = window.location.pathname
        if (
            current === path ||
            (current === "/" && path === assignmentPath(DEMO_PROBLEM))
        ) {
            return
        }
        window.history.pushState(null, "", path)
        // pushState does not emit popstate; update the view for app-initiated navigation.
        syncLocation()
    }

    return { route, workspaceAssignment, navigate }
}
