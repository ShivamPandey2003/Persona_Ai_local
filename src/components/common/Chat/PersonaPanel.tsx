import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, MessageSquare, Users, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CircularLoader } from "@/components/ui/loader";

import { usePersonaList, usePersonaDashboard } from "@/api/Persona/query";
import { useStartGroupChat } from "@/api/GroupChat/mutation";
import { personaInitials } from "@/lib/personaColors";
import { cn } from "@/lib/utils";

const confidenceColors: Record<string, string> = {
  High: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Med-High": "bg-sky-100 text-sky-800 border-sky-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  Low: "bg-rose-100 text-rose-800 border-rose-200",
};

function coverageColor(value: number): string {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 70) return "bg-sky-500";
  return "bg-amber-500";
}

function groupTitle(names: string[]): string {
  if (names.length === 1) return names[0];
  const head = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${head} +${names.length - 3}` : head;
}

function SummaryCard({
  icon,
  value,
  label,
  iconBg,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  iconBg: string;
}) {
  return (
    <Card className="h-fit">
      <CardContent className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconBg)}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type PersonaPanelProps = {
  projectId: string | undefined;
  /** Called after a chat is successfully started (e.g. to close a dialog). */
  onStarted?: () => void;
  /** Height of the scrollable persona grid. */
  scrollHeight?: string;
};

/**
 * Persona dashboard content: summary counts plus a grid of persona cards.
 *
 * Launch point for chat — "Chat" starts a one-persona group chat, the
 * multi-select footer starts a group chat with several personas. Single and
 * multiple persona chats both run through the group-chat endpoints. Used inline
 * as a project's persona dashboard and inside PersonaPanelDialog.
 */
function PersonaPanel({ projectId, onStarted, scrollHeight = "h-[420px]" }: PersonaPanelProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const personasQuery = usePersonaList(projectId);
  const dashboardQuery = usePersonaDashboard(projectId);
  const startGroup = useStartGroupChat();

  const personas = personasQuery.data?.personas ?? [];
  const summary = dashboardQuery.data?.summary;

  // Clear selection when the project changes.
  useEffect(() => {
    setSelected({});
    setPendingId(null);
  }, [projectId]);

  const selectedPersonas = useMemo(
    () => personas.filter((p) => selected[p.persona_id]),
    [personas, selected],
  );

  const startChat = (personaIds: string[], title: string, marker: string) => {
    if (!projectId || personaIds.length === 0 || startGroup.isPending) return;
    setPendingId(marker);
    startGroup.mutate(
      { projectId, personaIds, title },
      {
        onSuccess: () => onStarted?.(),
        onError: () => setPendingId(null),
      },
    );
  };

  const toggle = (personaId: string) =>
    setSelected((prev) => ({ ...prev, [personaId]: !prev[personaId] }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />}
          iconBg="bg-emerald-100"
          value={summary?.personas_created ?? personas.length}
          label="Personas Created"
        />
        <SummaryCard
          icon={<XCircle className="h-5 w-5 text-red-700" />}
          iconBg="bg-red-100"
          value={summary?.insufficient_data ?? 0}
          label="Insufficient Data"
        />
        <SummaryCard
          icon={<BarChart3 className="h-5 w-5 text-foreground" />}
          iconBg="bg-secondary"
          value={summary?.data_files ?? 0}
          label="Data Files"
        />
      </div>

      <ScrollArea className={scrollHeight}>
        {personasQuery.isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <CircularLoader size="lg" />
          </div>
        ) : personas.length === 0 ? (
          <div className="flex h-[400px] flex-col items-center justify-center gap-1 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No personas yet</p>
            <p className="text-xs text-muted-foreground">
              Use the persona-builder chat to create personas first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 p-1 md:grid-cols-3">
            {personas.map((persona) => {
              const isSelected = Boolean(selected[persona.persona_id]);
              const isPending = pendingId === persona.persona_id;
              return (
                <Card
                  key={persona.persona_id}
                  className={cn(
                    "flex flex-col transition-shadow",
                    isSelected && "ring-2 ring-primary",
                  )}
                >
                  <CardContent className="flex flex-1 flex-col gap-4 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {personaInitials(persona.persona_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-snug text-foreground">
                            {persona.persona_name}
                          </p>
                          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                            {persona.status}
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(persona.persona_id)}
                        aria-label={`Select ${persona.persona_name}`}
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Coverage
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0", confidenceColors[persona.confidence])}
                        >
                          {persona.confidence}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-secondary">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all",
                              coverageColor(persona.coverage),
                            )}
                            style={{ width: `${persona.coverage}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          {persona.coverage}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={startGroup.isPending}
                        onClick={() =>
                          startChat(
                            [persona.persona_id],
                            persona.persona_name,
                            persona.persona_id,
                          )
                        }
                      >
                        {isPending ? (
                          <CircularLoader size="sm" />
                        ) : (
                          <MessageSquare className="mr-2 h-4 w-4" />
                        )}
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">
          {selectedPersonas.length > 0
            ? `${selectedPersonas.length} selected`
            : "Select personas to start a group chat"}
        </span>
        <Button
          disabled={selectedPersonas.length === 0 || startGroup.isPending}
          onClick={() =>
            startChat(
              selectedPersonas.map((p) => p.persona_id),
              groupTitle(selectedPersonas.map((p) => p.persona_name)),
              "group",
            )
          }
        >
          {pendingId === "group" ? (
            <CircularLoader size="sm" className="border-white" />
          ) : (
            <Users className="mr-2 h-4 w-4" />
          )}
          Start Group Chat
        </Button>
      </div>
    </>
  );
}

export default PersonaPanel;
