/** @deprecated Currently unused / placeholder for community discussions */
import {
    MessageSquare,
    Search,
    Plus,
    ThumbsUp,
    MessageCircle,
    Pin,
    Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export function DiscussSkeletonView() {
    const topics = [
        {
            id: "1",
            title: "Google L5 Onsite Experience (Systems & C / Concurrency Focus)",
            author: "dev_alumni",
            category: "Interview Experience",
            votes: 384,
            replies: 56,
            views: "4.2k",
            pinned: true,
            time: "3 hours ago",
        },
        {
            id: "2",
            title: "How to write zero-allocation C solutions that beat 99% in memory benchmarks",
            author: "kernel_guru",
            category: "Algorithms",
            votes: 890,
            replies: 112,
            views: "12.8k",
            pinned: true,
            time: "1 day ago",
        },
        {
            id: "3",
            title: "Meta E5 Technical Screen - Question Breakdown & Optimization Walkthrough",
            author: "coder_sarah",
            category: "Interview Experience",
            votes: 219,
            replies: 28,
            views: "3.1k",
            pinned: false,
            time: "2 days ago",
        },
        {
            id: "4",
            title: "Gradcamp Grader Architecture: How krun microVM sandboxing isolates submissions",
            author: "gradcamp_admin",
            category: "System Design",
            votes: 672,
            replies: 84,
            views: "8.4k",
            pinned: false,
            time: "4 days ago",
        },
    ]

    return (
        <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 overflow-y-auto bg-background p-4 md:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
                        <MessageSquare className="size-6 text-purple-500" />
                        <span>Community Discussions</span>
                    </h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Share interview experiences, ask for code reviews, and
                        discuss algorithmic breakthroughs
                    </p>
                </div>

                <Button size="sm" className="gap-1.5 text-xs font-semibold">
                    <Plus className="size-3.5" />
                    New Discussion
                </Button>
            </div>

            {/* Categories Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "All Topics", count: "1.2k" },
                    { label: "Interview Experience", count: "480" },
                    { label: "Compensation & Offers", count: "290" },
                    { label: "General / Feedback", count: "430" },
                ].map((c, idx) => (
                    <div
                        key={idx}
                        className={`cursor-pointer rounded-lg border border-border p-3 text-xs transition-colors ${
                            idx === 0
                                ? "border-primary/30 bg-primary/5"
                                : "bg-card hover:bg-muted/40"
                        }`}
                    >
                        <span className="block font-semibold text-foreground">
                            {c.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            {c.count} posts
                        </span>
                    </div>
                ))}
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search discussions or questions..."
                        className="w-full rounded-lg border border-border bg-background py-1.5 pr-3 pl-9 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                    />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Filter className="size-3" />
                    Filter
                </Button>
            </div>

            {/* Posts List */}
            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                {topics.map((t) => (
                    <div
                        key={t.id}
                        className="cursor-pointer space-y-1.5 p-4 text-xs transition-colors hover:bg-muted/20"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {t.pinned && (
                                    <Pin className="size-3.5 fill-amber-500 text-amber-500" />
                                )}
                                <h3 className="text-sm font-bold text-foreground hover:underline">
                                    {t.title}
                                </h3>
                            </div>
                            <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {t.category}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                            <span>
                                by{" "}
                                <strong className="text-foreground">
                                    {t.author}
                                </strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <ThumbsUp className="size-3" /> {t.votes}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <MessageCircle className="size-3" /> {t.replies}
                            </span>
                            <span>•</span>
                            <span>{t.time}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
