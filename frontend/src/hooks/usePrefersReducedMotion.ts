import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"
function subscribe(onChange: () => void) {
    const query = window.matchMedia(QUERY)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
}
const getSnapshot = () => window.matchMedia(QUERY).matches

// Subscribe rather than reading once, so a changed OS setting also stops autoplay.
export function usePrefersReducedMotion() {
    return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
