import type { Assignment, Submission } from "../types/index.ts"

export interface WorkspaceState {
    activeAssignment: Assignment
    codeByProblemId: Record<string, string>
    submissions: Submission[]
    activeSubmissionId: string | null
}

export type WorkspaceAction =
    | { type: "select-assignment"; assignment: Assignment }
    | { type: "edit-code"; code: string }
    | { type: "reset-code" }
    | { type: "select-submission"; id: string }
    | { type: "submission-started" }
    | { type: "submission-completed"; submission: Submission }

export function initialWorkspaceState(
    activeAssignment: Assignment
): WorkspaceState {
    return {
        activeAssignment,
        codeByProblemId: {},
        submissions: [],
        activeSubmissionId: null,
    }
}

export function getActiveCode(state: WorkspaceState): string {
    const assignment = state.activeAssignment
    return assignment.kind === "code"
        ? (state.codeByProblemId[assignment.id] ?? assignment.starterCode)
        : ""
}

export function getActiveSubmission(state: WorkspaceState): Submission | null {
    return (
        state.submissions.find(
            (submission) =>
                submission.id === state.activeSubmissionId &&
                submission.problemId === state.activeAssignment.id
        ) ?? null
    )
}

export function workspaceReducer(
    state: WorkspaceState,
    action: WorkspaceAction
): WorkspaceState {
    switch (action.type) {
        case "select-assignment":
            return {
                ...state,
                activeAssignment: action.assignment,
                activeSubmissionId:
                    action.assignment.id === state.activeAssignment.id
                        ? state.activeSubmissionId
                        : null,
            }
        case "edit-code":
        case "reset-code": {
            const assignment = state.activeAssignment
            if (assignment.kind !== "code") return state
            return {
                ...state,
                codeByProblemId: {
                    ...state.codeByProblemId,
                    [assignment.id]:
                        action.type === "edit-code"
                            ? action.code
                            : assignment.starterCode,
                },
            }
        }
        case "select-submission": {
            const submission = state.submissions.find(
                (item) =>
                    item.id === action.id &&
                    item.problemId === state.activeAssignment.id
            )
            return submission
                ? { ...state, activeSubmissionId: submission.id }
                : state
        }
        case "submission-started":
            return { ...state, activeSubmissionId: null }
        case "submission-completed":
            return {
                ...state,
                submissions: [action.submission, ...state.submissions],
                // Navigation can change assignments while the request is in flight.
                // Keep the result in history without selecting it in another workspace.
                activeSubmissionId:
                    action.submission.problemId === state.activeAssignment.id
                        ? action.submission.id
                        : state.activeSubmissionId,
            }
    }
}
