import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PersonaDetail } from "@/data/DummyPersona"
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate } from "react-router"

const confidenceColors: Record<string, string> = {
  High: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Med-High": "bg-sky-100 text-sky-800 border-sky-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
}

function CoverageBar({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-emerald-500"
      : value >= 70
        ? "bg-sky-500"
        : "bg-amber-500"

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-secondary">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-foreground">{value}%</span>
    </div>
  )
}

function PersonaResultCard({ persona, id }: { persona:PersonaDetail, id:string }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate();
  const uuid = crypto.randomUUID();

  const initials = persona.title
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-snug">{persona.title}</CardTitle>
              <p className="mt-0.5 min-h-[2.5rem] text-xs text-muted-foreground">{persona.role}</p>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 ${confidenceColors[persona.confidence]}`}>
            {persona.confidence}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* --- Row 2: Matched N (fixed height) --- */}
        <div className="min-h-[5.5rem] rounded-lg border border-border bg-secondary/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Matched N (across studies)
          </p>
          <div className="flex flex-wrap gap-2">
            {persona.matchedN.map((m) => (
              <span
                key={m.study}
                className="inline-flex items-center gap-1 rounded-md bg-background px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border"
              >
                {m.study}
                <span className="font-semibold text-primary">n={m.n.toLocaleString()}</span>
              </span>
            ))}
          </div>
        </div>

        {/* --- Row 3: Coverage (fixed height) --- */}
        <div className="min-h-[3rem]">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coverage
          </p>
          <CoverageBar value={persona.coverage} />
        </div>

        {/* --- Row 4: Evidence categories - collapsible (fills remaining) --- */}
        <div className="flex-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Evidence by Category</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expanded && (
            <div className="space-y-2.5">
              {persona.evidenceCategories.map((cat) => (
                <div key={cat.category} className="rounded-lg border border-border p-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <p className="text-xs font-semibold text-foreground">{cat.category}</p>
                  </div>
                  <div className="space-y-1">
                    {cat.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-baseline justify-between gap-2"
                      >
                        <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                          {item.label}
                        </p>
                        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold tabular-nums text-primary">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- Row 5: Chat action (pinned bottom) --- */}
        <div className="mt-auto pt-2">
          <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={()=>{
            navigate(`/chat/${uuid}`, {state:{projectId:id}})
          }}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat with Persona
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PersonaResultCard;