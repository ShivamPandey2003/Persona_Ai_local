import { apiRequest } from "@/services/apiService";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export type Project = {
  project_id: string;
  project_name: string;
  project_type: string;
  description: string | null;
  status: string;
  total_personas_count: number;
  personas_ready: number;
  total_files_count: number;
  files_processed: number;
};

type GetProjectListRes = {
  header: ResponseHeader;
  response: {
    projects: Project[];
    pagination: Pagination;
  };
};

/** Default page size for the projects listing (matches the backend default). */
export const PROJECTS_PAGE_SIZE = 10;

/**
 * POST /v1/projects/list — paginated, server-side searched project listing.
 *
 * `search`, `offset` and `limit` are all part of the query key so paging and
 * searching each refetch. `keepPreviousData` keeps the current page on screen
 * while the next one loads, avoiding an empty-table flash. The backend ignores
 * 1–2 character searches, so the query is disabled until the term clears or
 * reaches 3 characters.
 */
export const getProjectList = (
  search: string = "",
  offset: number = 0,
  limit: number = PROJECTS_PAGE_SIZE,
) => {
  const userStr = localStorage.getItem("user");
  const userData = userStr ? JSON.parse(atob(userStr)) : null;
  const token = userData?.token || "";

  return useQuery<GetProjectListRes, Record<string, any>>({
    queryKey: ["ProjectList", search, offset, limit],
    queryFn: async () => {
      const payload = { token, search, limit, offset };
      const res = await apiRequest("post", "projects/list", payload);
      const data = await res;
      return data.response;
    },
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled: !!token && (search.length === 0 || search.length >= 3),
  });
};
