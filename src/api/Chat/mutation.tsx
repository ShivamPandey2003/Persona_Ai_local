import { apiRequest } from "@/services/apiService";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "react-router";

type ChatMessageT = {
  assistant_message: string;
  persona_progress: PersonaProgressT;
};

type ChatMessageRes = {
  header: ResponseHeader;
  response: ChatMessageT;
};

type ChatMessagePayload = {
  token: string;
  conversation_id: string;
  message: string;
};

export const ChatMessage = (cb: React.Dispatch<React.SetStateAction<MessageT[]>>) => {
  const userStr = localStorage.getItem("user");
  const userData = userStr ? JSON.parse(atob(userStr)) : null;
  const token = userData?.token || "";
  const { id } = useParams();
  const ChatMessage = useMutation<
    ChatMessageRes,
    Record<string, any>,
    { message: string }
  >({
    mutationKey: ["ChatMessages"],
    mutationFn: async (pd) => {
      const payload: ChatMessagePayload = {
        token: token,
        conversation_id: id as string,
        message: pd.message,
      };
      const res = await apiRequest("post", "persona/chat/message", payload);

      return res.response;
    },
    onSuccess: (data) => {
      cb((pre) => [
        ...pre,
        {
          message: data.response.assistant_message,
          userType: "Assistant",
          id: crypto.randomUUID(),
          persona_progress: data.response.persona_progress,
        },
      ]);
    },
  });

  return ChatMessage
};
