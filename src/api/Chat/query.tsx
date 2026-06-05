import { useQuery } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";

type RawBuilderMessage = {
  role: "assistant" | "user";
  message: string;
};

type BuilderHistoryResponse = {
  messages: RawBuilderMessage[];
};

/**
 * POST /v1/persona/chat/history — rehydrate a persona-builder conversation.
 *
 * The opening assistant message created by /chat/start is part of the saved
 * history, so a freshly started conversation already returns one message here.
 */
export const useBuilderChatHistory = (conversationId: string | undefined) => {
  const token = getAuthToken();
  return useQuery<MessageT[]>({
    queryKey: ["BuilderChatHistory", conversationId],
    queryFn: async () => {
      const data = await postApi<BuilderHistoryResponse>("persona/chat/history", {
        token,
        conversation_id: conversationId,
      });
      return (data.messages ?? []).map((m, i) => ({
        id: `${conversationId}-h-${i}`,
        message: m.message,
        userType: m.role === "assistant" ? "Assistant" : "User",
      }));
    },
    enabled: Boolean(token && conversationId),
    refetchOnWindowFocus: false,
    // The view seeds local state from history once per mount and then appends
    // replies itself, so drop the cache on unmount to guarantee a reopened
    // conversation re-fetches the full persisted transcript.
    staleTime: 0,
    gcTime: 0,
  });
};
