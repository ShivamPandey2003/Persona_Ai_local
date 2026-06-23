import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";
import { useHistoryPager } from "@/hooks/useHistoryPager";

/**
 * History is stored one turn per row: a single `user_message` plus the list of
 * persona `responses` that turn produced (one entry for a single-target reply,
 * many for a broadcast). The view renders a flat list of bubbles, so each turn
 * is flattened into one user bubble followed by one bubble per response.
 */
type RawPersonaReply = {
  persona_id: string;
  persona_name: string;
  response: string;
  evidence_tags?: string[];
};

type RawGroupTurn = {
  user_message: string | null;
  responses: RawPersonaReply[];
};

type GroupHistoryResponse = {
  messages: RawGroupTurn[];
  pagination?: Pagination;
};

/** Turns fetched per history window (matches the backend default). */
const HISTORY_PAGE_SIZE = 20;

/**
 * POST /v1/persona/group-chat/history — windowed transcript rehydration.
 *
 * Loads the newest window first and prepends older windows as the user scrolls
 * up (see {@link useHistoryPager}).
 */
export const useGroupHistory = (groupId: string | undefined) => {
  const token = getAuthToken();

  const fetchPage = useCallback(
    async (offset: number, limit: number) => {
      const data = await postApi<GroupHistoryResponse>("persona/group-chat/history", {
        token,
        group_id: groupId,
        limit,
        offset,
      });
      const items = data.messages ?? [];
      return { items, total: data.pagination?.total ?? items.length };
    },
    [token, groupId],
  );

  const pager = useHistoryPager<RawGroupTurn>(
    token && groupId ? groupId : undefined,
    fetchPage,
    HISTORY_PAGE_SIZE,
  );

  // Flatten each turn: the user bubble, then one bubble per persona reply.
  const messages = useMemo<GroupMessageT[]>(() => {
    const out: GroupMessageT[] = [];
    for (const { index, data } of pager.turns) {
      if (data.user_message != null) {
        out.push({
          id: `${groupId}-h-${index}-u`,
          role: "user",
          message: data.user_message,
        });
      }
      (data.responses ?? []).forEach((r, j) => {
        out.push({
          id: `${groupId}-h-${index}-p${j}`,
          role: "persona",
          message: r.response,
          persona_name: r.persona_name,
          evidence_tags: r.evidence_tags,
        });
      });
    }
    return out;
  }, [pager.turns, groupId]);

  return {
    messages,
    isInitialLoading: pager.isInitialLoading,
    isError: pager.isError,
    ready: pager.ready,
    hasOlder: pager.hasOlder,
    isLoadingOlder: pager.isLoadingOlder,
    loadOlder: pager.loadOlder,
  };
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
