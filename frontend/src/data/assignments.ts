import type { Assignment, LearningAssignment } from "@/types"
import { MOCK_PROBLEMS } from "./mockProblems"

export const POINTERS_LECTURE: LearningAssignment = {
    id: "pointers-lecture",
    numericId: 2,
    kind: "lecture",
    contentId: "pointers",
    title: "Pointers: the basics",
    slug: "pointers-basics",
    category: "Pointers & Memory",
    difficulty: "Easy",
    description:
        "Explore addresses, dereferencing, and writes through pointers with a step-by-step memory model.",
    estimatedMinutes: 10,
}

export const POINTERS_QUIZ: LearningAssignment = {
    id: "pointers-quiz",
    numericId: 3,
    kind: "quiz",
    contentId: "pointers",
    title: "Pointers: memory lab",
    slug: "pointers-memory-lab",
    category: "Pointers & Memory",
    difficulty: "Easy",
    description:
        "Answer six interactive questions about pointer values, memory updates, and safe dereferencing.",
    estimatedMinutes: 8,
}

export const ASSIGNMENTS: Assignment[] = [
    ...MOCK_PROBLEMS,
    POINTERS_LECTURE,
    POINTERS_QUIZ,
]
export const ASSIGNMENT_KIND_LABELS = {
    code: "Code",
    lecture: "Lecture",
    quiz: "Quiz",
} as const
