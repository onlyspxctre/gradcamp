import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react"
import {
    readProgress,
    restoreAssignmentProgress,
    serializeAssignmentProgress,
    updateProgress,
    type ProgressById,
    type ProgressCodec,
    type ProgressDefinition,
} from "@/lib/assignmentProgress"

const STORAGE_KEY = "gradcamp.learning.v2"
const LEGACY_STORAGE_KEY = "gradcamp.learning.v1"
const LearningContext = createContext<{
    progress: ProgressById
    setProgress: (update: (previous: ProgressById) => ProgressById) => void
} | null>(null)

export function LearningProvider({
    children,
    codecs,
}: {
    children: ReactNode
    codecs: readonly ProgressCodec[]
}) {
    const [progress, setProgress] = useState<ProgressById>(() => {
        try {
            return restoreAssignmentProgress(
                localStorage.getItem(STORAGE_KEY),
                localStorage.getItem(LEGACY_STORAGE_KEY),
                codecs
            )
        } catch {
            return new Map()
        }
    })
    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                serializeAssignmentProgress(progress)
            )
        } catch {
            /* Lessons still work when browser storage is blocked or full. */
        }
    }, [progress])
    return (
        <LearningContext.Provider value={{ progress, setProgress }}>
            {children}
        </LearningContext.Provider>
    )
}

export function useLearning() {
    const context = useContext(LearningContext)
    if (!context)
        throw new Error("useLearning must be used within LearningProvider")
    return context
}

export function useAssignmentProgress<State, Action>(
    definition: ProgressDefinition<State, Action>
) {
    const { progress, setProgress } = useLearning()
    const dispatch = useCallback(
        (action: Action) => {
            setProgress((previous) =>
                updateProgress(previous, definition, action)
            )
        },
        [definition, setProgress]
    )
    return { progress: readProgress(progress, definition), dispatch }
}
