import { useState } from "react";

import { cn } from "@/lib/utils";
import type { DashboardPersona } from "@/api/Persona/query";

/** Friendly labels for known study_type_ids; falls back to a humanised id. */
const STUDY_TYPE_LABELS: Record<string, string> = {
  ua: "U&A",
  price_pack: "Price-Pack",
  claims: "Claims",
};

function formatStudyType(id: string): string {
  const key = id.toLowerCase().replace(/[\s-]+/g, "_");
  if (STUDY_TYPE_LABELS[key]) return STUDY_TYPE_LABELS[key];
  return id
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Evidence categories shown before the "Show more" toggle appears. */
const EVIDENCE_COLLAPSED_COUNT = 2;

/**
 * run_query output for one persona: matched N per study and the evidence grouped
 * by category (theme name -> labelled items with support %). Shared by the
 * persona dashboard cards and the group-chat participant detail sheet. Renders
 * nothing until the persona_query job has populated this persona.
 */
function PersonaEvidence({
  data,
  className,
}: {
  data?: DashboardPersona;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  const hasStudies = data.study_summary.length > 0;
  const categories = data.evidence_by_category;
  const hasEvidence = categories.length > 0;
  if (!hasStudies && !hasEvidence) return null;

  const isLong = categories.length > EVIDENCE_COLLAPSED_COUNT;
  const visibleCategories =
    expanded || !isLong ? categories : categories.slice(0, EVIDENCE_COLLAPSED_COUNT);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Matched N across studies (study_summary). */}
      {hasStudies && (
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Matched N (across studies)
          </p>
          <div className="flex flex-wrap gap-2">
            {data.study_summary.map((study) => (
              <span
                key={study.study_type_id}
                className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {formatStudyType(study.study_type_id)} n={study.unique_respondent_count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Evidence grouped by category/theme (final_evidence_by_category). */}
      {hasEvidence && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Evidence by category
          </p>
          <div className="flex flex-col gap-2">
            {visibleCategories.map((category) => (
              <div key={category.theme_id} className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  {category.theme_name}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {category.items.map((item, index) => (
                    <li
                      key={`${category.theme_id}-${index}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="text-xs text-foreground">{item.label}</span>
                      {item.support_pct != null && (
                        <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
                          {Math.round(item.support_pct)}%
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 self-start text-xs font-semibold text-primary hover:underline"
              aria-expanded={expanded}
            >
              {expanded
                ? "Show less"
                : `Show ${categories.length - EVIDENCE_COLLAPSED_COUNT} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PersonaEvidence;
