import { useMutation, useQuery } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Required-format schema (synthetic example shown on the upload page) */
/* ------------------------------------------------------------------ */

export type DataSchemaColumn = {
  name: string;
  type: string;
  measure: string;
  label: string;
  example: string | number;
};

export type DataFileSchema = {
  accepted_formats: string[];
  max_file_size_mb: number;
  max_files_per_upload: number;
  sheets: { name: string; description: string }[];
  columns: DataSchemaColumn[];
  sample_rows: Record<string, string | number>[];
  total_variables_hint: string;
  notes: string[];
};

/**
 * POST /v1/projects/files/data/schema — the synthetic (dummy) example of the
 * survey-data format we accept. Static on the backend, so it is cached forever
 * for this session and never refetched.
 */
export const useDataFileSchema = () => {
  const token = getAuthToken();
  return useQuery<DataFileSchema>({
    queryKey: ["DataFileSchema"],
    queryFn: () => postApi<DataFileSchema>("projects/files/data/schema", { token }),
    enabled: Boolean(token),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

/* ------------------------------------------------------------------ */
/* Proxy upload (browser -> API -> S3)                                */
/* ------------------------------------------------------------------ */

export type UploadedDataFile = {
  file_id: string;
  file_name: string;
  status: string;
  s3_key: string;
  size: number;
};

type DataFileUploadResponse = {
  files: UploadedDataFile[];
  errors: { file_name: string; reason: string }[];
};

/**
 * Upload the project's survey data file(s) through the API (proxy upload) and
 * return the persisted file records.
 *
 * The browser posts the raw bytes as multipart/form-data to
 * /projects/files/data/upload; the API stores them in S3 itself, so no
 * browser→S3 request (and therefore no bucket CORS / FE PutObject grant) is
 * required. Throws a user-facing error if the server rejects any file so the
 * caller can surface it and let the user retry.
 */
export async function uploadDataFiles(
  projectId: string,
  files: File[],
): Promise<UploadedDataFile[]> {
  if (files.length === 0) return [];

  const token = getAuthToken();
  const form = new FormData();
  form.append("token", token);
  form.append("project_id", projectId);
  files.forEach((f) => form.append("files", f, f.name));

  const data = await postApi<DataFileUploadResponse>(
    "projects/files/data/upload",
    form as unknown as Record<string, unknown>,
  );

  const uploaded = data.files ?? [];
  const rejected = data.errors ?? [];

  if (rejected.length > 0) {
    throw new Error(rejected[0]?.reason || "Some files could not be uploaded");
  }
  if (uploaded.length !== files.length) {
    throw new Error("Could not upload all files, please retry");
  }

  return uploaded;
}

/* ------------------------------------------------------------------ */
/* Start the background pipeline                                       */
/* ------------------------------------------------------------------ */

export type ProcessDataFilesResult = {
  job_id: string;
  status: string;
  files: number;
};

/**
 * POST /v1/projects/files/data/process — kick off the heavy background pipeline
 * for the project's uploaded files. Pass the just-uploaded `fileIds` to scope it
 * precisely (omit to process every uploaded file on the project). Returns the
 * `job_id` to poll via {@link useDataFilePipelineJob}.
 */
export const useProcessDataFiles = () => {
  const token = getAuthToken();
  return useMutation<
    ProcessDataFilesResult,
    Error,
    { projectId: string; fileIds?: string[] }
  >({
    mutationKey: ["ProcessDataFiles"],
    mutationFn: ({ projectId, fileIds }) =>
      postApi<ProcessDataFilesResult>("projects/files/data/process", {
        token,
        project_id: projectId,
        ...(fileIds && fileIds.length > 0 ? { file_ids: fileIds } : {}),
      }),
  });
};

/* ------------------------------------------------------------------ */
/* Pipeline job status (poll)                                          */
/* ------------------------------------------------------------------ */

export type DataPipelineStepStatus = "pending" | "running" | "done" | "failed";

/** One step of the file-pipeline stepper; counts are across all files in the job. */
export type DataPipelineStep = {
  key: string;
  label: string;
  status: DataPipelineStepStatus;
  done: number;
  failed: number;
  total: number;
};

export type DataPipelineJobResult = {
  files?: { file_id: string; file_name: string; ok: boolean; reason?: string | null }[];
  error?: string;
  failed?: number;
};

/** Inner payload of POST /v1/projects/job-status for a file_pipeline job. */
export type DataPipelineJob = {
  job_id: string;
  job_type?: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  result: DataPipelineJobResult | null;
  steps: DataPipelineStep[] | null;
};

/** Polling cadence (ms) while the pipeline is in flight. */
const JOB_POLL_INTERVAL_MS = 1200;

/**
 * POST /v1/projects/job-status — poll a file_pipeline job until it settles.
 *
 * Refetches every {@link JOB_POLL_INTERVAL_MS} while queued/running and stops
 * once done/failed. Disabled until a jobId is provided. Mirrors the persona-build
 * poll (usePersonaBuildJob).
 */
export const useDataFilePipelineJob = (jobId: string | null | undefined) => {
  const token = getAuthToken();
  return useQuery<DataPipelineJob>({
    queryKey: ["DataPipelineJob", jobId],
    queryFn: () =>
      postApi<DataPipelineJob>("projects/job-status", {
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
