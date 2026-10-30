import * as React from "react"
import { flushSync } from "react-dom"

type Theme = "dark" | "light" | "system"
type ResolvedTheme = "dark" | "light"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
    disableTransitionOnChange?: boolean
}

type ThemeProviderState = {
    theme: Theme
    resolvedTheme: ResolvedTheme
    setTheme: (theme: Theme) => void
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"
const THEME_VALUES: Theme[] = ["dark", "light", "system"]

const ThemeProviderContext = React.createContext<
    ThemeProviderState | undefined
>(undefined)

function isTheme(value: string | null): value is Theme {
    if (value === null) {
        return false
    }

    return THEME_VALUES.includes(value as Theme)
}

function getSystemTheme(): ResolvedTheme {
    if (window.matchMedia(COLOR_SCHEME_QUERY).matches) {
        return "dark"
    }

    return "light"
}

function subscribeToSystemTheme(onChange: () => void) {
    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY)
    mediaQuery.addEventListener("change", onChange)
    return () => mediaQuery.removeEventListener("change", onChange)
}

function disableTransitionsTemporarily() {
    const style = document.createElement("style")
    style.appendChild(
        document.createTextNode(
            "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
        )
    )
    document.head.appendChild(style)

    return () => {
        window.getComputedStyle(document.body)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                style.remove()
            })
        })
    }
}

function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
        return false
    }

    if (target.isContentEditable) {
        return true
    }

    const editableParent = target.closest(
        "input, textarea, select, [contenteditable='true']"
    )
    if (editableParent) {
        return true
    }

    return false
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "theme",
    disableTransitionOnChange = true,
    ...props
}: ThemeProviderProps) {
    const [theme, setThemeState] = React.useState<Theme>(() => {
        const storedTheme = localStorage.getItem(storageKey)
        if (isTheme(storedTheme)) {
            return storedTheme
        }

        return defaultTheme
    })

    const systemTheme = React.useSyncExternalStore(
        subscribeToSystemTheme,
        getSystemTheme
    )
    const resolvedTheme = theme === "system" ? systemTheme : theme

    const themeRef = React.useRef(theme)
    const transitionRef = React.useRef<ViewTransition | null>(null)
    const changeVersionRef = React.useRef(0)

    const cancelThemeTransition = React.useCallback(() => {
        changeVersionRef.current += 1
        transitionRef.current?.skipTransition()
        transitionRef.current = null
        document.documentElement.removeAttribute("data-theme-transition")
    }, [])

    const applyTheme = React.useCallback(
        (nextTheme: Theme) => {
            const root = document.documentElement
            const resolvedTheme =
                nextTheme === "system" ? getSystemTheme() : nextTheme
            if (root.classList.contains(resolvedTheme)) return

            const restoreTransitions = disableTransitionOnChange
                ? disableTransitionsTemporarily()
                : null

            root.classList.remove("light", "dark")
            root.classList.add(resolvedTheme)

            if (restoreTransitions) {
                restoreTransitions()
            }
        },
        [disableTransitionOnChange]
    )

    const setTheme = React.useCallback(
        (nextTheme: Theme) => {
            const root = document.documentElement
            const nextResolvedTheme =
                nextTheme === "system" ? getSystemTheme() : nextTheme
            const schemeChanged = !root.classList.contains(nextResolvedTheme)

            // A second request must supersede even a not-yet-captured transition.
            cancelThemeTransition()
            const version = changeVersionRef.current
            themeRef.current = nextTheme
            localStorage.setItem(storageKey, nextTheme)

            const update = () => {
                if (version !== changeVersionRef.current) return
                // Capture the root palette, React controls, and Monaco in one frame.
                flushSync(() => {
                    applyTheme(nextTheme)
                    setThemeState(nextTheme)
                })
            }

            if (
                !schemeChanged ||
                !document.startViewTransition ||
                window.matchMedia(REDUCED_MOTION_QUERY).matches
            ) {
                update()
                return
            }

            root.dataset.themeTransition = nextResolvedTheme
            try {
                const transition = document.startViewTransition(update)
                transitionRef.current = transition
                const cleanup = () => {
                    if (transitionRef.current !== transition) return
                    transitionRef.current = null
                    root.removeAttribute("data-theme-transition")
                }
                // Skips (rapid toggles, hidden tabs) reject ready, but still run update.
                void transition.ready.catch(() => {})
                void transition.finished.then(cleanup, cleanup)
            } catch {
                root.removeAttribute("data-theme-transition")
                update()
            }
        },
        [storageKey, applyTheme, cancelThemeTransition]
    )

    React.useEffect(() => {
        themeRef.current = theme
        // Initial appearance and OS changes are immediate, not animated.
        if (!document.documentElement.classList.contains(resolvedTheme)) {
            cancelThemeTransition()
            applyTheme(theme)
        }
    }, [theme, resolvedTheme, applyTheme, cancelThemeTransition])

    React.useEffect(() => cancelThemeTransition, [cancelThemeTransition])

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.repeat) {
                return
            }

            if (event.metaKey || event.ctrlKey || event.altKey) {
                return
            }

            if (isEditableTarget(event.target)) {
                return
            }

            if (event.key.toLowerCase() !== "d") {
                return
            }

            const currentTheme =
                themeRef.current === "system"
                    ? getSystemTheme()
                    : themeRef.current
            setTheme(currentTheme === "dark" ? "light" : "dark")
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [setTheme])

    React.useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.storageArea !== localStorage) {
                return
            }

            if (event.key !== storageKey) {
                return
            }

            cancelThemeTransition()
            const nextTheme = isTheme(event.newValue)
                ? event.newValue
                : defaultTheme
            themeRef.current = nextTheme
            setThemeState(nextTheme)
        }

        window.addEventListener("storage", handleStorageChange)

        return () => {
            window.removeEventListener("storage", handleStorageChange)
        }
    }, [defaultTheme, storageKey, cancelThemeTransition])

    const value = React.useMemo(
        () => ({
            theme,
            resolvedTheme,
            setTheme,
        }),
        [theme, resolvedTheme, setTheme]
    )

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = React.useContext(ThemeProviderContext)

    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }

    return context
}
