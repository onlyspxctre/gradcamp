import {
  Server,
  Activity,
  Cpu,
  ShieldCheck,
  Database,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export function QueueMonitorView() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 overflow-y-auto bg-background p-4 md:p-8">
      <div className="flex flex-col justify-between gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Server className="size-6 text-blue-500" />
            <span>Worker Queue & MicroVM Runtime</span>
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Real-time status of Gradcamp autograder workers, Redis broker, and
            krun execution sandboxes
          </p>
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <RefreshCw className="size-3" />
          Refresh Nodes
        </Button>
      </div>

      {/* Cluster Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pending Jobs</span>
            <Activity className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">0</div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Queue idle (ready)
          </span>
        </div>

        <div className="space-y-1 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Active Worker Daemons</span>
            <Cpu className="size-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">4</div>
          <span className="text-[11px] text-muted-foreground">
            Pool: worker-01 .. worker-04
          </span>
        </div>

        <div className="space-y-1 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Isolation Runtime</span>
            <ShieldCheck className="size-4 text-purple-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            krun
          </div>
          <span className="text-[11px] text-purple-600 dark:text-purple-400">
            Hardware virtualization
          </span>
        </div>

        <div className="space-y-1 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Broker Datastore</span>
            <Database className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">Redis</div>
          <span className="font-mono text-[11px] text-muted-foreground">
            jobs_pending LPUSH/RPOP
          </span>
        </div>
      </div>

      {/* Worker Nodes Status Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
          Worker Node Topography
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card text-xs">
          <table className="w-full text-left">
            <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Node ID</th>
                <th className="px-4 py-2.5">Backend API</th>
                <th className="px-4 py-2.5">Container Runtime</th>
                <th className="px-4 py-2.5">CPU Utilization</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {[
                {
                  id: "worker-node-1",
                  api: "http://0.0.0.0:3000",
                  runtime: "krun v0.2.1",
                  cpu: "12%",
                  status: "Online",
                },
                {
                  id: "worker-node-2",
                  api: "http://0.0.0.0:3000",
                  runtime: "krun v0.2.1",
                  cpu: "4%",
                  status: "Online",
                },
                {
                  id: "worker-node-3",
                  api: "http://0.0.0.0:3000",
                  runtime: "krun v0.2.1",
                  cpu: "7%",
                  status: "Online",
                },
                {
                  id: "worker-node-4",
                  api: "http://0.0.0.0:3000",
                  runtime: "krun v0.2.1",
                  cpu: "0%",
                  status: "Standby",
                },
              ].map((node) => (
                <tr key={node.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono font-medium text-foreground">
                    {node.id}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">
                    {node.api}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">
                    {node.runtime}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-foreground">
                    {node.cpu}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      {node.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
