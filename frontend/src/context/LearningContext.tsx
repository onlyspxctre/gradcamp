import {
    createContext,
    useContext,
    useEffect,
    useReducer,
    type Dispatch,
    type ReactNode,
} from "react"
import {
    learningReducer,
    restoreLearningProgress,
    type LearningAction,
    type LearningProgress,
} from "@/lib/learningProgress"

const STORAGE_KEY = "gradcamp.learning.v1"
const LearningContext = createContext<{
    progress: LearningProgress
    dispatch: Dispatch<LearningAction>
} | null>(null)

export function LearningProvider({ children }: { children: ReactNode }) {
    const [progress, dispatch] = useReducer(learningReducer, null, () => {
        try {
            return restoreLearningProgress(localStorage.getItem(STORAGE_KEY))
        } catch {
            return restoreLearningProgress(null)
        }
    })
    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ version: 1, ...progress })
            )
        } catch {
            /* Lessons still work when browser storage is blocked or full. */
        }
    }, [progress])
    return (
        <LearningContext.Provider value={{ progress, dispatch }}>
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
