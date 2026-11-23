import type { Assignment, LearningAssignment } from "@/types"
import { useLearning } from "@/context/LearningContext"
import { getLearningActivity } from "./learningActivities"
import { LearningAssignmentView } from "./LearningAssignmentView"

interface LearningAssignmentPageProps {
    assignment: LearningAssignment
    assignments: readonly Assignment[]
    onSelectAssignment: (assignment: LearningAssignment) => void
    onBack: () => void
}

export function LearningAssignmentPage({
    assignment,
    assignments,
    onSelectAssignment,
    onBack,
}: LearningAssignmentPageProps) {
    const { progress } = useLearning()
    const activity = getLearningActivity(assignment.id)
    if (!activity)
        return (
            <LearningAssignmentView
                assignment={assignment}
                completed={false}
                onBack={onBack}
            >
                <p role="status">This assignment’s content is unavailable.</p>
            </LearningAssignmentView>
        )

    const { Body, related } = activity
    const target =
        related && assignments.find((item) => item.id === related.assignmentId)
    const relatedAssignment =
        related && target && target.kind !== "code"
            ? {
                  label: related.label,
                  onOpen: () => onSelectAssignment(target),
              }
            : undefined
    return (
        <LearningAssignmentView
            assignment={assignment}
            completed={activity.status(progress) === "solved"}
            onBack={onBack}
            relatedAssignment={relatedAssignment}
            itemSummary={activity.itemSummary}
            footerNote={activity.footerNote}
        >
            <Body onOpenRelated={relatedAssignment?.onOpen} />
        </LearningAssignmentView>
    )
}
