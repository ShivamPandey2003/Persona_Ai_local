import { useQuery } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";

type PersonaListResponse = {
  personas: PersonaListItem[];
};

/** POST /v1/persona/list — active personas for a project. */
export const usePersonaList = (projectId: string | undefined) => {
  const token = getAuthToken();
  return useQuery<PersonaListResponse>({
    queryKey: ["PersonaList", projectId],
    queryFn: () =>
      postApi<PersonaListResponse>("persona/list", {
        token,
        project_id: projectId,
      }),
    enabled: Boolean(token && projectId),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
};

/** One categorised evidence item (run_query final_evidence_by_category). */
export type EvidenceItem = {
  label: string | null;
  support_pct: number | null;
  n: number | null;
  question?: string | null;
  option?: string | null;
  study_type_id?: string | null;
};

/** Evidence grouped by theme, as produced by run_query for a persona. */
export type EvidenceCategory = {
  theme_id: string;
  theme_name: string;
  items: EvidenceItem[];
};

/** One row of a persona's study breakdown (run_query study_summary). */
export type StudySummaryRow = {
  study_type_id: string;
  total_rows: number;
  unique_respondent_count: number;
};

/** Per-persona run_query output surfaced on the dashboard. */
export type DashboardPersona = {
  persona_id: string;
  persona_name: string | null;
  status: string;
  matched_respondents: number;
  unique_studies: number;
  unique_respondents: number;
  study_summary: StudySummaryRow[];
  evidence_by_category: EvidenceCategory[];
};

type PersonaDashboardResponse = {
  summary: {
    personas_created: number;
    insufficient_data: number;
    data_files: number;
    /** Distinct studies / respondents across all personas (run_query rollups). */
    unique_studies: number;
    unique_respondents: number;
  };
  personas: DashboardPersona[];
};

/**
 * POST /v1/persona/dashboard — aggregate counts for the panel header plus each
 * persona's run_query result (study breakdown + evidence-by-category).
 */
export const usePersonaDashboard = (projectId: string | undefined) => {
  const token = getAuthToken();
  return useQuery<PersonaDashboardResponse>({
    queryKey: ["PersonaDashboard", projectId],
    queryFn: () =>
      postApi<PersonaDashboardResponse>("persona/dashboard", {
        token,
        project_id: projectId,
      }),
    enabled: Boolean(token && projectId),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
};

/* ------------------------------------------------------------------ */
/* persona_query background job (run_query)                           */
/* ------------------------------------------------------------------ */

/** One persona's run_query output, as carried by the job result. */
export type RunQueryPersona = {
  persona_index: number | null;
  study_summary: StudySummaryRow[];
  final_evidence_by_category: EvidenceCategory[];
};

/** The job's result JSON once run_query finishes. */
export type PersonaQueryJobResult = {
  personas: RunQueryPersona[];
  error?: string;
};

/** Inner payload of POST /v1/projects/job-status for a persona_query job. */
export type PersonaBuildJob = {
  job_id: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  result: PersonaQueryJobResult | null;
};

/** Polling cadence (ms) while a build job is in flight. */
const JOB_POLL_INTERVAL_MS = 1200;

/**
 * POST /v1/projects/job-status — poll a persona_query job until it settles.
 *
 * Refetches every {@link JOB_POLL_INTERVAL_MS} while the job is queued/running
 * and stops once it is done/failed, so the progress bar advances live without a
 * manual interval. Disabled until a jobId is provided.
 */
export const usePersonaBuildJob = (jobId: string | null | undefined) => {
  const token = getAuthToken();
  return useQuery<PersonaBuildJob>({
    queryKey: ["PersonaBuildJob", jobId],
    queryFn: () =>
      postApi<PersonaBuildJob>("projects/job-status", {
        token,
        job_id: jobId,
      }),
    enabled: Boolean(token && jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : JOB_POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
};
