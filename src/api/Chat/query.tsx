import { apiRequest } from "@/services/apiService";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router";

type ChatStart = {
  conversation_id: string;
  first_message: string;
};

type ChartStartRes = {
  header: ResponseHeader;
  response: ChatStart;
};

type ChartStartPayload = {
  token: string;
  project_id: string;
};

export const ChatStart = () => {
  const userStr = localStorage.getItem("user");
  const userData = userStr ? JSON.parse(atob(userStr)) : null;
  const token = userData?.token || "";
  const { state } = useLocation();

  const ChatStart = useQuery<ChartStartRes, Record<string, any>>({
    queryKey: ["ChartStart"],
    queryFn: async () => {
      const payload: ChartStartPayload = {
        token: token,
        project_id: state.projectId,
      };
      const res = await apiRequest("post", "persona/chat/start", payload);

      return res.response;
    },
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!token && !!state.projectId,
  });

  return ChatStart;
};
