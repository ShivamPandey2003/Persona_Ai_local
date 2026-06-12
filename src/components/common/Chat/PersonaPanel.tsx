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

/**
 * Humanise a taxonomy id for display:
 *   "brand.equity_positioning" -> "Equity Positioning"
 *   "digital_tools_services"   -> "Digital Tools Services"
 */
function humanizeToken(raw: string): string {
  const tail = raw.includes(".") ? raw.slice(raw.indexOf(".") + 1) : raw;
  return tail
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Demographic keys -> display labels, in render order. */
const DEMOGRAPHIC_LABELS: Array<[keyof PersonaDemographics, string]> = [
  ["age_group", "Age"],
  ["gender", "Gender"],
  ["income", "Income"],
  ["country", "Country"],
  ["ethnicity", "Ethnicity"],
  ["marital_status", "Marital status"],
  ["primary_shopper_household", "Primary shopper"],
];

/** Non-empty demographic [label, value] pairs for a persona. */
function demographicEntries(data?: PersonaDemographics | null): Array<[string, string]> {
  if (!data) return [];
  return DEMOGRAPHIC_LABELS.map(
    ([key, label]) => [label, data[key]] as [string, string | null | undefined],
  ).filter((e): e is [string, string] => e[1] != null && e[1] !== "");
}

/** A labelled row of chips, hidden when there are no items. */
function DetailChips({ label, items }: { label: string; items?: string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md bg-secondary px-2 py-0.5 text-xs text-foreground"
          >
            {humanizeToken(item)}
          </span>
        ))}
      </div>
    </div>
  );
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

/**
 * All persona-builder details for one card: taxonomy, demographics, and the
 * mapped construct/theme/role/timeframe/scope/profile ids. Renders nothing for
 * personas without builder output (e.g. data-file generated personas).
 */
/** Collapsed height (px) for a persona's detail block before "Show more". */
const DETAILS_COLLAPSED_MAX = 132;

function PersonaDetails({ persona }: { persona: PersonaListItem }) {
  const [expanded, setExpanded] = useState(false);

  const taxonomy = [
    persona.industry ? (["Industry", humanizeToken(persona.industry)] as const) : null,
    persona.category ? (["Category", humanizeToken(persona.category)] as const) : null,
    persona.sub_category_id
      ? (["Sub-category", humanizeToken(persona.sub_category_id)] as const)
      : null,
  ].filter(Boolean) as Array<readonly [string, string]>;

  const demographics = demographicEntries(persona.demographics);

  const chipGroups: Array<[string, string[] | null | undefined]> = [
    ["Micro-categories", persona.micro_category],
    ["Themes", persona.theme_ids],
    ["Constructs", persona.construct_ids],
    ["Roles", persona.role_type_ids],
    ["Timeframes", persona.timeframe_ids],
    ["Entity scope", persona.entity_scope_ids],
    ["Profile fields", persona.profile_ids],
  ];

  const populatedChipGroups = chipGroups.filter(
    ([, items]) => items && items.length > 0,
  );
  const isEmpty =
    taxonomy.length === 0 &&
    demographics.length === 0 &&
    populatedChipGroups.length === 0;
  if (isEmpty) return null;

  // "Show more" appears only for detail-heavy personas; deterministic (no DOM
  // measurement) so it stays stable across renders. Collapsed view is clamped
  // to a fixed height via CSS.
  const sectionCount =
    (taxonomy.length > 0 ? 1 : 0) +
    (demographics.length > 0 ? 1 : 0) +
    populatedChipGroups.length;
  const isLong = sectionCount > 3;
  const collapsed = isLong && !expanded;

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div
        style={{ maxHeight: collapsed ? DETAILS_COLLAPSED_MAX : undefined }}
        className={cn(
          "flex flex-col gap-3 transition-[max-height] duration-200",
          collapsed && "overflow-hidden",
        )}
      >
      {taxonomy.length > 0 && (
        <div className="flex flex-col gap-1">
          {taxonomy.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <span className="truncate text-right text-xs font-medium text-foreground">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {demographics.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Demographics
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {demographics.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
                <dd className="text-xs font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {chipGroups.map(([label, items]) => (
        <DetailChips key={label} label={label} items={items} />
      ))}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-xs font-semibold text-primary hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
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

  const allSelected =
    personas.length > 0 && selectedPersonas.length === personas.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      setSelected(Object.fromEntries(personas.map((p) => [p.persona_id, true])));
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
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {personaInitials(persona.persona_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-snug text-foreground">
                            {persona.persona_name ?? "Untitled persona"}
                          </p>
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

                    {!isBuilderPersona(persona) && (
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
                    )}

                    <PersonaDetails persona={persona} />

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
              groupTitle(selectedPersonas.map((p) => p.persona_name ?? "Persona")),
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
