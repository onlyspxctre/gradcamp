import { Code2, Sun, Moon, User, BookOpen, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ActiveNavTab } from "@/types"

interface NavbarProps {
    activeTab: ActiveNavTab
    setActiveTab: (tab: ActiveNavTab) => void
}

const NAV_ITEMS = [
    { id: "workspace", label: "Workspace", icon: Code2 },
    { id: "assignments", label: "Assignments", icon: BookOpen },
    { id: "submissions", label: "Submissions", icon: History },
] as const

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
    const { resolvedTheme, setTheme } = useTheme()
    const toggleTheme = () =>
        setTheme(resolvedTheme === "dark" ? "light" : "dark")

    return (
        <header className="z-40 shrink-0 border-b border-border bg-card/80">
            <div className="flex flex-wrap items-center justify-between gap-x-6 px-5 md:px-7">
                <button
                    onClick={() => setActiveTab("workspace")}
                    className="flex h-16 items-center gap-2.5 text-foreground"
                    aria-label="Gradcamp home"
                >
                    <svg
                        viewBox="0 0 36 36"
                        className="size-8 text-primary"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path
                            d="M5 25.5h26M8 30h20M8 21a10 10 0 0 1 20 0"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <path
                            d="M18 3v4M5.3 8.3l2.8 2.8M30.7 8.3l-2.8 2.8M1 20h4M31 20h4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className="brand-wordmark">
                        gradcamp<span className="text-primary">.</span>
                    </span>
                </button>

                <nav
                    aria-label="Main navigation"
                    className="order-3 flex w-full items-center md:order-none md:w-auto md:self-stretch"
                >
                    {NAV_ITEMS.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className="nav-link"
                            aria-current={activeTab === id ? "page" : undefined}
                        >
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
                        title="Toggle theme (D)"
                        className="text-muted-foreground"
                    >
                        {resolvedTheme === "dark" ? (
                            <Sun className="size-4" />
                        ) : (
                            <Moon className="size-4" />
                        )}
                    </Button>
                    <span className="h-4 w-px bg-border" aria-hidden="true" />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                                aria-label="Open account menu"
                            >
                                <User className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Gradcamp</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                                <DropdownMenuItem
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                >
                                    <Icon className="size-4" />
                                    {label}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={toggleTheme}>
                                {resolvedTheme === "dark" ? (
                                    <Sun className="size-4" />
                                ) : (
                                    <Moon className="size-4" />
                                )}
                                {resolvedTheme === "dark"
                                    ? "Light appearance"
                                    : "Dark appearance"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}
