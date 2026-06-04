import { apiRequest } from "@/services/apiService";
import { useQuery } from "@tanstack/react-query";

export type Project = {
  project_id: string;
  project_name: string;
  project_type: string;
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
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  };
};

export const getProjectList = (search: string = "", offset: number = 0) => {
  const userStr = localStorage.getItem("user");
  const userData = userStr ? JSON.parse(atob(userStr)) : null;
  const token = userData?.token || "";
  const query = useQuery<GetProjectListRes, Record<string, any>>({
    queryKey: ["ProjectList", search],
    queryFn: async () => {
      const payload = {
        token: token,
        search: search,
        limit: 10,
        offset: offset,
      };
      const res = await apiRequest("post", "projects/list", payload);
      const data = await res;
      return data.response;
    },
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!token && (search.length === 0 || search.length >= 3),
  });

  return query;
};
