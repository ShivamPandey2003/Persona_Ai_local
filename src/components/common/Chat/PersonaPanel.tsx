import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Info,
  LayoutGrid,
  List,
  MessageSquare,
  Pencil,
  Users,
  XCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularLoader } from "@/components/ui/loader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import EmptyState from "@/components/common/EmptyState";
import PersonaEvidence, { COVERAGE_HOVER_TEXT } from "./PersonaEvidence";

import {
  usePersonaList,
  usePersonaDashboard,
  type DashboardPersona,
} from "@/api/Persona/query";
import { usePersonaUpdate } from "@/api/Persona/mutation";
import { useStartGroupChat } from "@/api/GroupChat/mutation";
import { useCountUp } from "@/hooks/useCountUp";
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

/**
 * True when a persona came from the persona-builder agent (vs. data-file
 * generation). Builder personas have no meaningful coverage/confidence, so
 * those columns are hidden for them.
 */
function isBuilderPersona(p: PersonaListItem): boolean {
  return (
    p.persona_index != null ||
    Boolean(p.industry || p.category || p.sub_category_id || p.demographics) ||
    [
      p.micro_category,
      p.theme_ids,
      p.construct_ids,
      p.role_type_ids,
      p.timeframe_ids,
      p.entity_scope_ids,
      p.profile_ids,
    ].some((a) => a != null && a.length > 0)
  );
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
  const display = useCountUp(value);
  return (
    <Card className="h-fit transition-shadow duration-200 hover:shadow-md">
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            iconBg,
          )}
        >
          {icon}
        </div>
        <div>
          {/* Number ticks up to its value (count-up animation). */}
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {display}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Placeholder for a grid card's run_query output (coverage + evidence) while the
 * dashboard query is still loading. Mirrors PersonaEvidence's layout. */
function EvidenceSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 border-t pt-3">
      <div className="rounded-lg border p-3">
        <Skeleton className="mb-2 h-2.5 w-24" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
      <div>
        <Skeleton className="mb-2 h-2.5 w-16" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border p-3">
            <Skeleton className="mb-2 h-3.5 w-32" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A single loading row for the list view. */
function PersonaListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 ring-1 ring-foreground/5">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="hidden h-8 w-36 shrink-0 rounded sm:block" />
      <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
    </div>
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
function PersonaPanel({
  projectId,
  onStarted,
  scrollHeight = "h-[420px]",
}: PersonaPanelProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Expand is per grid ROW, not per card: collapsed rows share a fixed card
  // height (evidence scrolls inside); expanding one card expands the whole row
  // and stretches every card in it to one shared height. Keyed by row index,
  // which depends on how many columns the responsive grid currently shows.
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [columns, setColumns] = useState(3);
  // Dashboard layout: rich "grid" cards or a compact "list" for scanning many.
  const [view, setView] = useState<"grid" | "list">("list");
  // List view: which rows have their evidence panel expanded (by persona id).
  const [openEvidence, setOpenEvidence] = useState<Record<string, boolean>>({});
  const toggleEvidence = (id: string) =>
    setOpenEvidence((prev) => ({ ...prev, [id]: !prev[id] }));

  const personasQuery = usePersonaList(projectId);
  const dashboardQuery = usePersonaDashboard(projectId);
  const startGroup = useStartGroupChat();

  // Order personas by their persona_index (0,1,2,3…) so the panel is stable and
  // matches the dashboard sequence. Personas without an index (non-builder) keep
  // their original order after the indexed ones. Copy first — never sort the
  // TanStack Query cache array in place.
  const personas = useMemo(() => {
    const list = personasQuery.data?.personas ?? [];
    return [...list].sort(
      (a, b) =>
        (a.persona_index ?? Number.POSITIVE_INFINITY) -
        (b.persona_index ?? Number.POSITIVE_INFINITY),
    );
  }, [personasQuery.data?.personas]);
  const summary = dashboardQuery.data?.summary;

  // run_query output (study breakdown + evidence) keyed by persona_id, merged
  // onto each list card below.
  const evidenceByPersona = useMemo(() => {
    const map = new Map<string, DashboardPersona>();
    for (const p of dashboardQuery.data?.personas ?? []) {
      map.set(p.persona_id, p);
    }
    return map;
  }, [dashboardQuery.data?.personas]);

  // Track the grid's column count (1 below the md breakpoint, 3 at/above it) so
  // personas can be grouped into rows and a whole row expanded together.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setColumns(mq.matches ? 3 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Clear selection + collapse everything when the project changes.
  useEffect(() => {
    setSelected({});
    setPendingId(null);
    setExpandedRows({});
    setOpenEvidence({});
  }, [projectId]);

  const selectedPersonas = useMemo(
    () => personas.filter((p) => selected[p.persona_id]),
    [personas, selected],
  );

  const allSelected =
    personas.length > 0 && selectedPersonas.length === personas.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      setSelected(
        Object.fromEntries(personas.map((p) => [p.persona_id, true])),
      );
    }
  };

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

  // Inline persona rename.
  const updatePersona = usePersonaUpdate(projectId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const cancelRenameRef = useRef(false);

  const startRename = (id: string, name: string | null) => {
    setEditingId(id);
    setDraft(name ?? "");
  };

  const submitRename = (id: string, currentName: string | null) => {
    const name = draft.trim();
    setEditingId(null);
    if (!name || name.length < 2 || name === (currentName ?? "")) return;
    updatePersona.mutate(
      { personaId: id, personaName: name },
      { onSuccess: () => toast.success("Persona renamed") },
    );
  };

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

      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-sm font-medium text-foreground">
          Personas{personas.length > 0 ? ` · ${personas.length}` : ""}
        </p>
        <div className="inline-flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            aria-label="List view"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              view === "grid"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </button>
        </div>
      </div>

      <ScrollArea className={scrollHeight}>
        {personasQuery.isLoading ? (
          view === "list" ? (
            <div className="flex flex-col gap-2.5 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <PersonaListRowSkeleton key={`list-skeleton-${i}`} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 p-1 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card
                  key={`persona-skeleton-${i}`}
                  className="flex h-[620px] flex-col"
                >
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="mt-auto h-9 w-full rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : personas.length === 0 ? (
          <EmptyState
            className="h-[400px] justify-center"
            icon={<Users className="h-6 w-6" />}
            title="No personas yet"
            description="Use the persona-builder chat to create personas first."
          />
        ) : view === "list" ? (
          <div className="flex flex-col gap-2.5 p-1">
            {personas.map((persona) => {
              const isSelected = Boolean(selected[persona.persona_id]);
              const isPending = pendingId === persona.persona_id;
              const dash = evidenceByPersona.get(persona.persona_id);
              const coverage = dash?.final_coverage;
              const hasCoverage = typeof coverage === "number" && coverage > 0;
              const dashHasEvidence = Boolean(
                dash &&
                (dash.study_summary.length > 0 ||
                  dash.evidence_by_category.length > 0),
              );
              const isEvidenceOpen = Boolean(openEvidence[persona.persona_id]);
              return (
                <div
                  key={persona.persona_id}
                  className={cn(
                    "rounded-xl border bg-card ring-1 ring-foreground/5 transition-shadow hover:shadow-md",
                    isSelected && "ring-2 ring-primary",
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
                    <Checkbox
                      className="border border-gray-200 shadow"
                      checked={isSelected}
                      onCheckedChange={() => toggle(persona.persona_id)}
                      aria-label={`Select ${persona.persona_name ?? "persona"}`}
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {personaInitials(persona.persona_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      {editingId === persona.persona_id ? (
                        <input
                          autoFocus
                          value={draft}
                          maxLength={150}
                          disabled={updatePersona.isPending}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelRenameRef.current = true;
                              e.currentTarget.blur();
                            }
                          }}
                          onBlur={() => {
                            if (cancelRenameRef.current) {
                              cancelRenameRef.current = false;
                              setEditingId(null);
                              return;
                            }
                            submitRename(
                              persona.persona_id,
                              persona.persona_name,
                            );
                          }}
                          className="w-full rounded-md border border-input bg-background px-1.5 py-0.5 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                      ) : (
                        <div className="group/name flex items-center gap-1">
                          <p
                            className="truncate text-sm font-semibold text-foreground"
                            title={persona.persona_name ?? "Untitled persona"}
                          >
                            {persona.persona_name ?? "Untitled persona"}
                          </p>
                          <button
                            type="button"
                            aria-label="Rename persona"
                            onClick={() =>
                              startRename(
                                persona.persona_id,
                                persona.persona_name,
                              )
                            }
                            className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/name:opacity-100"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="capitalize">{persona.status}</span>
                        {dash && dash.unique_studies > 0 && (
                          <>
                            <span aria-hidden>·</span>
                            <span>
                              {dash.unique_studies}{" "}
                              {dash.unique_studies === 1 ? "study" : "studies"}
                            </span>
                          </>
                        )}
                        {dash && dash.unique_respondents > 0 && (
                          <>
                            <span aria-hidden>·</span>
                            <span>
                              {dash.unique_respondents.toLocaleString()}{" "}
                              respondents
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    {hasCoverage && (
                      <div className="hidden w-36 shrink-0 sm:block">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Coverage
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="What does coverage mean?"
                                  className="text-muted-foreground/70 transition-colors hover:text-foreground"
                                >
                                  <Info className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-left leading-relaxed">
                                {COVERAGE_HOVER_TEXT}
                              </TooltipContent>
                            </Tooltip>
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-foreground">
                            {Math.round(coverage as number)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-secondary">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              coverageColor(coverage as number),
                            )}
                            style={{ width: `${coverage}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {!dash && dashboardQuery.isLoading && (
                      <div className="hidden w-36 shrink-0 sm:block">
                        <Skeleton className="mb-1 h-2.5 w-16" />
                        <Skeleton className="h-1.5 w-full rounded-full" />
                      </div>
                    )}
                    {dashHasEvidence && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleEvidence(persona.persona_id)}
                        aria-expanded={isEvidenceOpen}
                      >
                        Evidence
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            isEvidenceOpen && "rotate-180",
                          )}
                        />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={startGroup.isPending}
                      onClick={() =>
                        startChat(
                          [persona.persona_id],
                          persona.persona_name ?? "Persona",
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
                  {isEvidenceOpen && dashHasEvidence && (
                    <div className="border-t p-3 duration-200 animate-in fade-in slide-in-from-top-1">
                      <PersonaEvidence
                        data={dash}
                        showCoverage={false}
                        evidenceCols={2}
                        collapsible={false}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 p-1 md:grid-cols-3">
            {personas.map((persona, index) => {
              const isSelected = Boolean(selected[persona.persona_id]);
              const isPending = pendingId === persona.persona_id;
              const rowIndex = Math.floor(index / columns);
              const isExpanded = Boolean(expandedRows[rowIndex]);
              const dash = evidenceByPersona.get(persona.persona_id);
              return (
                <Card
                  key={persona.persona_id}
                  style={{
                    animationDelay: `${Math.min(index, 12) * 40}ms`,
                    animationFillMode: "backwards",
                  }}
                  className={cn(
                    "flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 hover:shadow-md",
                    // Collapsed: fixed height, evidence scrolls inside. Expanded:
                    // drop the cap and stretch to the row's tallest card so every
                    // card in the row ends up the same height.
                    isExpanded ? "self-stretch" : "h-[620px]",
                    isSelected && "ring-2 ring-primary",
                  )}
                >
                  <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {personaInitials(persona.persona_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          {editingId === persona.persona_id ? (
                            <input
                              autoFocus
                              value={draft}
                              maxLength={150}
                              disabled={updatePersona.isPending}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelRenameRef.current = true;
                                  e.currentTarget.blur();
                                }
                              }}
                              onBlur={() => {
                                if (cancelRenameRef.current) {
                                  cancelRenameRef.current = false;
                                  setEditingId(null);
                                  return;
                                }
                                submitRename(
                                  persona.persona_id,
                                  persona.persona_name,
                                );
                              }}
                              className="w-full rounded-md border border-input bg-background px-1.5 py-0.5 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                            />
                          ) : (
                            <div className="group/name flex items-start gap-1">
                              <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-foreground">
                                {persona.persona_name ?? "Untitled persona"}
                              </p>
                              <button
                                type="button"
                                aria-label="Rename persona"
                                onClick={() =>
                                  startRename(
                                    persona.persona_id,
                                    persona.persona_name,
                                  )
                                }
                                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/name:opacity-100"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                            {persona.status}
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        className="border border-gray-200 shadow"
                        checked={isSelected}
                        onCheckedChange={() => toggle(persona.persona_id)}
                        aria-label={`Select ${persona.persona_name ?? "persona"}`}
                      />
                    </div>

                    {!isBuilderPersona(persona) &&
                      evidenceByPersona.get(persona.persona_id)
                        ?.final_coverage == null && (
                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Coverage
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0",
                                confidenceColors[persona.confidence],
                              )}
                            >
                              {persona.confidence}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-secondary">
                              <div
                                className={cn(
                                  "h-2 rounded-full transition-all animate-[coverage-grow_0.8s_ease-out]",
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
                      )}

                    {dash ? (
                      <PersonaEvidence
                        data={dash}
                        className="border-t pt-3"
                        expanded={isExpanded}
                        onExpandedChange={(next) =>
                          setExpandedRows((prev) => ({
                            ...prev,
                            [rowIndex]: next,
                          }))
                        }
                      />
                    ) : dashboardQuery.isLoading ? (
                      <EvidenceSkeleton />
                    ) : null}

                    <div className="mt-auto pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={startGroup.isPending}
                        onClick={() =>
                          startChat(
                            [persona.persona_id],
                            persona.persona_name ?? "Persona",
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
        <div className="flex items-center gap-3">
          {personas.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all personas"
              />
              Select all
            </label>
          )}
          <span className="text-xs text-muted-foreground">
            {selectedPersonas.length > 0
              ? `${selectedPersonas.length} selected`
              : "Select personas to start a group chat"}
          </span>
        </div>
        <Button
          disabled={selectedPersonas.length === 0 || startGroup.isPending}
          onClick={() =>
            startChat(
              selectedPersonas.map((p) => p.persona_id),
              groupTitle(
                selectedPersonas.map((p) => p.persona_name ?? "Persona"),
              ),
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
