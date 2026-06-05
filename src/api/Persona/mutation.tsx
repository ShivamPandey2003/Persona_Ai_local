import { useMutation } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";

type GenerateResponse = {
  job_id: string;
  status: string;
  personas: string[];
};

/**
 * POST /v1/persona/generate.
 *
 * Generation runs synchronously on the backend (dummy data today) and is
 * idempotent per project — calling it when personas already exist returns the
 * existing set instead of creating duplicates.
 */
export const usePersonaGenerate = () => {
  const token = getAuthToken();
  return useMutation<GenerateResponse, Error, { projectId: string }>({
    mutationKey: ["PersonaGenerate"],
    mutationFn: ({ projectId }) =>
      postApi<GenerateResponse>("persona/generate", {
        token,
        project_id: projectId,
      }),
  });
};
