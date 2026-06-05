import { useQuery } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";

type RawGroupMessage = {
  role: "user" | "persona";
  message: string;
  persona_name?: string;
};

type GroupHistoryResponse = {
  messages: RawGroupMessage[];
};

/** POST /v1/persona/group-chat/history — full interleaved transcript. */
export const useGroupChatHistory = (groupId: string | undefined) => {
  const token = getAuthToken();
  return useQuery<GroupMessageT[]>({
    queryKey: ["GroupChatHistory", groupId],
    queryFn: async () => {
      const data = await postApi<GroupHistoryResponse>("persona/group-chat/history", {
        token,
        group_id: groupId,
      });
      return (data.messages ?? []).map((m, i) => ({
        id: `${groupId}-h-${i}`,
        role: m.role,
        message: m.message,
        persona_name: m.persona_name,
      }));
    },
    enabled: Boolean(token && groupId),
    refetchOnWindowFocus: false,
    // The view seeds local state from history once per mount and then appends
    // replies itself, so drop the cache on unmount to guarantee a reopened chat
    // re-fetches the full persisted transcript.
    staleTime: 0,
    gcTime: 0,
  });
};

type GroupParticipantsResponse = {
  participants: GroupParticipant[];
};

/** POST /v1/persona/group-chat/participants — speaker labels + colours. */
export const useGroupChatParticipants = (groupId: string | undefined) => {
  const token = getAuthToken();
  return useQuery<GroupParticipant[]>({
    queryKey: ["GroupChatParticipants", groupId],
    queryFn: async () => {
      const data = await postApi<GroupParticipantsResponse>(
        "persona/group-chat/participants",
        { token, group_id: groupId },
      );
      return data.participants ?? [];
    },
    enabled: Boolean(token && groupId),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};
