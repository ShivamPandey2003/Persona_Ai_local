import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { personaColorStyle, personaInitials } from "@/lib/personaColors";
import { usePersonaList } from "@/api/Persona/query";

/** Avatars shown in the header stack before collapsing into a "+N" pill. */
const MAX_AVATARS = 5;

const DEMOGRAPHIC_LABELS: Array<[keyof PersonaDemographics, string]> = [
  ["age_group", "Age"],
  ["gender", "Gender"],
  ["income", "Income"],
  ["country", "Country"],
  ["ethnicity", "Ethnicity"],
  ["marital_status", "Marital status"],
  ["primary_shopper_household", "Primary shopper"],
];

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

/** "brand.equity_positioning" -> "Equity Positioning". */
function humanizeToken(raw: string): string {
  const tail = raw.includes(".") ? raw.slice(raw.indexOf(".") + 1) : raw;
  return tail
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function PersonaAvatar({
  participant,
  className,
}: {
  participant: GroupParticipant;
  className?: string;
}) {
  const style = personaColorStyle(participant.color);
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-background",
        style.avatar,
        className,
      )}
    >
      {personaInitials(participant.persona_name)}
    </span>
  );
}

/** A labelled row of chips (themes, constructs, …), hidden when empty. */
function DetailChips({
  label,
  items,
}: {
  label: string;
  items?: string[] | null;
}) {
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

function PersonaDetailView({
  participant,
  detail,
  loading,
  onBack,
}: {
  participant: GroupParticipant;
  detail: PersonaListItem | undefined;
  loading: boolean;
  onBack?: () => void;
}) {
  const demographics = (
    detail?.demographics
      ? DEMOGRAPHIC_LABELS.map(
          ([key, label]) =>
            [label, detail.demographics?.[key]] as [
              string,
              string | null | undefined,
            ],
        )
      : []
  ).filter((e): e is [string, string] => e[1] != null && e[1] !== "");

  const taxonomy = (
    detail
      ? [
          detail.industry
            ? (["Industry", humanizeToken(detail.industry)] as const)
            : null,
          detail.category
            ? (["Category", humanizeToken(detail.category)] as const)
            : null,
          detail.sub_category_id
            ? (["Sub-category", humanizeToken(detail.sub_category_id)] as const)
            : null,
        ]
      : []
  ).filter(Boolean) as Array<readonly [string, string]>;

  const chipGroups: Array<[string, string[] | null | undefined]> = detail
    ? [
        ["Micro-categories", detail.micro_category],
        ["Themes", detail.theme_ids],
        ["Constructs", detail.construct_ids],
        ["Roles", detail.role_type_ids],
        ["Timeframes", detail.timeframe_ids],
        ["Entity scope", detail.entity_scope_ids],
        ["Profile fields", detail.profile_ids],
      ]
    : [];

  const showCoverage =
    detail != null && typeof detail.coverage === "number" && detail.coverage > 0;
  const hasAnyDetail =
    showCoverage ||
    demographics.length > 0 ||
    taxonomy.length > 0 ||
    chipGroups.some(([, items]) => items && items.length > 0);

  return (
    <>
      <SheetHeader className="gap-2 border-b">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All participants
          </button>
        )}
        <div className="flex items-center gap-3">
          <PersonaAvatar
            participant={participant}
            className="h-12 w-12 text-sm"
          />
          <div className="min-w-0">
            <SheetTitle className="truncate">
              {participant.persona_name}
            </SheetTitle>
            {detail?.status && (
              <SheetDescription className="capitalize">
                {detail.status}
              </SheetDescription>
            )}
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-4">
          {showCoverage && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Coverage
                </span>
                <Badge
                  variant="outline"
                  className={cn("shrink-0", confidenceColors[detail!.confidence])}
                >
                  {detail!.confidence}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-2 rounded-full animate-[coverage-grow_0.8s_ease-out]",
                      coverageColor(detail!.coverage),
                    )}
                    style={{ width: `${detail!.coverage}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {detail!.coverage}%
                </span>
              </div>
            </div>
          )}

          {demographics.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Demographics
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                {demographics.map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <dt className="text-[11px] text-muted-foreground">{label}</dt>
                    <dd className="text-xs font-medium text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {taxonomy.length > 0 && (
            <div className="flex flex-col gap-1">
              {taxonomy.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-3"
                >
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

          {chipGroups.map(([label, items]) => (
            <DetailChips key={label} label={label} items={items} />
          ))}

          {loading && !detail && (
            <p className="text-xs text-muted-foreground">Loading details…</p>
          )}
          {!loading && !hasAnyDetail && (
            <p className="text-xs text-muted-foreground">
              No additional details available for this persona.
            </p>
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function ParticipantList({
  participants,
  onSelect,
}: {
  participants: GroupParticipant[];
  onSelect: (personaId: string) => void;
}) {
  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>Participants</SheetTitle>
        <SheetDescription>
          {participants.length}{" "}
          {participants.length === 1 ? "persona" : "personas"} in this group chat
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col p-2">
          {participants.map((p) => (
            <button
              key={p.persona_id}
              type="button"
              onClick={() => onSelect(p.persona_id)}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
            >
              <PersonaAvatar participant={p} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {p.persona_name}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </ScrollArea>
    </>
  );
}

type GroupParticipantsProps = {
  participants: GroupParticipant[];
  /** Project the group belongs to — used to load rich persona details. */
  projectId: string | undefined;
};

/**
 * Group-chat participants header: an overlapping avatar stack (capped with a
 * "+N" pill) that scales to any number of personas. Clicking an avatar opens
 * that persona's details in a side sheet; the "+N" pill / count opens the full
 * participant list. Rich details come from the project's persona list.
 */
function GroupParticipants({ participants, projectId }: GroupParticipantsProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const personasQuery = usePersonaList(projectId);
  const detailById = useMemo(() => {
    const map: Record<string, PersonaListItem> = {};
    (personasQuery.data?.personas ?? []).forEach((p) => {
      map[p.persona_id] = p;
    });
    return map;
  }, [personasQuery.data]);

  if (participants.length === 0) return null;

  const visible = participants.slice(0, MAX_AVATARS);
  const overflow = participants.length - visible.length;

  const openPersona = (id: string) => {
    setSelectedId(id);
    setOpen(true);
  };
  const openList = () => {
    setSelectedId(null);
    setOpen(true);
  };

  const selected =
    participants.find((p) => p.persona_id === selectedId) ?? null;

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex items-center -space-x-2">
          {visible.map((p) => (
            <Tooltip key={p.persona_id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => openPersona(p.persona_id)}
                  className="rounded-full transition-transform hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:outline-none"
                >
                  <PersonaAvatar participant={p} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{p.persona_name}</TooltipContent>
            </Tooltip>
          ))}
          {overflow > 0 && (
            <button
              type="button"
              onClick={openList}
              aria-label={`Show all ${participants.length} participants`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-2 ring-background transition-colors hover:bg-muted/70"
            >
              +{overflow}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={openList}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {participants.length}{" "}
          {participants.length === 1 ? "persona" : "personas"}
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          {selected ? (
            <PersonaDetailView
              participant={selected}
              detail={detailById[selected.persona_id]}
              loading={personasQuery.isLoading}
              onBack={
                participants.length > 1 ? () => setSelectedId(null) : undefined
              }
            />
          ) : (
            <ParticipantList
              participants={participants}
              onSelect={(id) => setSelectedId(id)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default GroupParticipants;
