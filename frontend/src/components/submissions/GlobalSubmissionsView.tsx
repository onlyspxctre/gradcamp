import { useState } from "react"
import type { Submission, Problem } from "@/types"
import { SubmissionStatusBadge } from "@/components/common/StatusBadges"
import { History, ExternalLink, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GlobalSubmissionsViewProps {
  submissions: Submission[]
  problems: Problem[]
  onSelectProblem: (problem: Problem) => void
}

export function GlobalSubmissionsView({
  submissions,
  problems,
  onSelectProblem,
}: GlobalSubmissionsViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>("All")

  const filteredSubmissions = submissions.filter((sub) => {
    if (filterStatus === "All") return true
    return sub.status === filterStatus
  })

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 overflow-y-auto bg-background p-4 md:p-8">
      <div className="flex flex-col justify-between gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <History className="size-6 text-emerald-500" />
            <span>Submission Log</span>
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Audit trail of all solutions evaluated by the Gradcamp engine
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 text-xs">
          {["All", "Accepted", "Wrong Answer", "Compile Error"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                filterStatus === st
                  ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Problem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Runtime</th>
                <th className="px-4 py-3">Memory</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <Code2 className="mx-auto mb-2 size-8 opacity-40" />
                    <p className="text-sm font-medium">
                      No submissions recorded yet
                    </p>
                    <p className="text-xs">
                      Solve a problem and submit code to see results here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const targetProblem = problems.find(
                    (p) => p.id === sub.problemId
                  )
                  return (
                    <tr
                      key={sub.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono whitespace-nowrap text-muted-foreground">
                        {sub.timestamp}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {sub.problemTitle}
                      </td>
                      <td className="px-4 py-3">
                        <SubmissionStatusBadge status={sub.status} />
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {sub.runtimeMs !== undefined
                          ? `${sub.runtimeMs} ms`
                          : "--"}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {sub.memoryMb !== undefined
                          ? `${sub.memoryMb} MB`
                          : "--"}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {sub.language}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {targetProblem && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onSelectProblem(targetProblem)}
                            className="gap-1 text-xs"
                          >
                            <span>Open</span>
                            <ExternalLink className="size-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
