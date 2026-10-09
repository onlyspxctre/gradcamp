import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export function App() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center text-sm leading-loose">
        <Badge variant="outline">React + shadcn/ui</Badge>
        <h1 className="text-2xl font-bold tracking-tight">Gradcamp Frontend</h1>
        <p className="text-muted-foreground">
          Single-page React application configured with Vite, Tailwind CSS, shadcn/ui theming, and Lucide icons.
        </p>
        <div className="flex justify-center gap-2">
          <Button>
            <Sparkles />
            Get Started
          </Button>
        </div>
      </div>
    </div>
  )
}

export default App
