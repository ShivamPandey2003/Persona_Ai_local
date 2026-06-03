import { queryClient } from "@/provider";
import { setProjectDelete } from "@/redux/GlobalModalSlice";
import type { AppDispatch } from "@/redux/store";
import { apiRequest } from "@/services/apiService";
import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

type CreateProjectPayload = {
  project_name: string;
  project_type: string;
  description: string;
};

type CreateProjectRes = {
  header: ResponseHeader;
  response: {
    project_id: string;
  };
};

export const CreateProject = (cb:()=>void) => {
  const navigate = useNavigate();
  const uuid = crypto.randomUUID();
  const createProject = useMutation<
    CreateProjectRes,
    Record<string, any>,
    CreateProjectPayload
  >({
    mutationKey: ["CreateProject"],
    mutationFn: async (payload) => {
      const userStr = localStorage.getItem("user");
      const userData = userStr ? JSON.parse(atob(userStr)) : null;
      const token = userData?.token || "";

      const requestPayload = {
        token,
        ...payload,
      };

      const res = await apiRequest("post", "projects/create", requestPayload);
      const data = await res;
      return data.response;
    },
    onSuccess: (response) => {
      navigate(`/chat/${uuid}`, {
        state: {
          projectId: response.response.project_id,
        },
      });
      queryClient.invalidateQueries({queryKey:["ProjectList"]})
      cb()
    },
  });

  return createProject;
};

type DeleteProjectPayload = {
  project_id: string;
};

type DeleteProjectRes = {
  header: ResponseHeader;
  response: Record<string, never>;
};

export const DeleteProject = () => {
    const dispatch = useDispatch<AppDispatch>()
  const deleteProject = useMutation<DeleteProjectRes, Record<string, any>, DeleteProjectPayload>({
    mutationKey: ["DeleteProject"],
    mutationFn: async (payload) => {
      const userStr = localStorage.getItem("user");
      const userData = userStr ? JSON.parse(atob(userStr)) : null;
      const token = userData?.token || "";

      const requestPayload = {
        token,
        ...payload,
      };

      const res = await apiRequest("post", "projects/delete", requestPayload);
      const data = await res;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ProjectList"] });
      dispatch(setProjectDelete(null))
    },
  });

  return deleteProject;
};
