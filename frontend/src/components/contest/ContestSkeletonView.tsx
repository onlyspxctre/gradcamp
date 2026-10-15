/** @deprecated Currently unused / placeholder for contest features */
import { Trophy, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ContestSkeletonView() {
    return (
        <div className="mx-auto w-full max-w-6xl flex-1 space-y-8 overflow-y-auto bg-background p-4 md:p-8">
            {/* Header */}
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
                    <Trophy className="size-6 text-amber-500" />
                    <span>Contests</span>
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Compete against engineers worldwide, earn rating badges, and
                    test algorithm speed under pressure
                </p>
            </div>

            {/* Featured Upcoming Contest */}
            <div className="space-y-4 rounded-xl border border-border bg-gradient-to-br from-amber-500/10 via-card to-background p-6 shadow-sm md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold tracking-wider text-white uppercase">
                            Featured
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                            90 Minutes Duration
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Clock className="size-3.5" />
                        <span>Starts in: 02d 14h 32m</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                        Gradcamp Weekly Contest 420
                    </h2>
                    <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground md:text-sm">
                        4 algorithmic challenges ranging from warm-up to
                        distributed systems optimization. Rated for all
                        participants.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                    <Button className="bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700">
                        Register Now
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                        View Problem Archive
                    </Button>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3.5" /> 14,291 Registered
                    </span>
                </div>
            </div>

            {/* Upcoming & Past Contests Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Biweekly card */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            Upcoming
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Saturday, 8:00 PM UTC
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                        Biweekly Contest 141
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        System performance & concurrency edition featuring C,
                        C++, and Go benchmarks.
                    </p>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="size-3" /> 8,402 Registered
                        </span>
                        <Button variant="ghost" size="xs" className="text-xs">
                            Register
                        </Button>
                    </div>
                </div>

                {/* Global Ranking preview */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Global Leaderboard
                        </span>
                        <Button
                            variant="link"
                            size="xs"
                            className="p-0 text-xs"
                        >
                            View All
                        </Button>
                    </div>
                    <div className="space-y-2 text-xs">
                        {[
                            {
                                rank: 1,
                                name: "tourist",
                                rating: 3942,
                                badge: "Grandmaster",
                            },
                            {
                                rank: 2,
                                name: "benq",
                                rating: 3810,
                                badge: "Grandmaster",
                            },
                            {
                                rank: 3,
                                name: "neal_wu",
                                rating: 3680,
                                badge: "Master",
                            },
                        ].map((user) => (
                            <div
                                key={user.rank}
                                className="flex items-center justify-between rounded bg-muted/30 p-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-4 text-center font-mono font-bold text-amber-500">
                                        #{user.rank}
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {user.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-muted-foreground">
                                        {user.rating}
                                    </span>
                                    <span className="py-0.2 rounded bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                                        {user.badge}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
