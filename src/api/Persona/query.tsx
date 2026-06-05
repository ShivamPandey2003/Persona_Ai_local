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

type PersonaDashboardResponse = {
  summary: {
    personas_created: number;
    insufficient_data: number;
    data_files: number;
  };
};

/** POST /v1/persona/dashboard — aggregate counts for the persona panel header. */
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
