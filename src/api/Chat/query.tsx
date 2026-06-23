import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";
import { getSession } from "@/lib/chatStore";
import { useHistoryPager } from "@/hooks/useHistoryPager";

/**
 * History is stored one turn per row: a single `user_message` (null for the
 * opening turn) paired with the assistant `response`. The view renders one
 * bubble per speaker, so each turn is flattened into up to two MessageT entries.
 */
type RawBuilderTurn = {
  user_message: string | null;
  response: string | null;
};

type BuilderHistoryResponse = {
  messages: RawBuilderTurn[];
  pagination?: Pagination;
};

/** Turns fetched per history window (matches the backend default). */
const HISTORY_PAGE_SIZE = 20;

/**
 * POST /v1/persona/chat/history — windowed rehydration of a builder chat.
 *
 * Loads the newest window first and prepends older windows as the user scrolls
 * up (see {@link useHistoryPager}). The opening assistant message (saved by the
 * flow="start" turn) is part of the persisted history, so a freshly started
 * conversation already returns one turn here.
 */
export const useBuilderHistory = (conversationId: string | undefined) => {
  const token = getAuthToken();

  const fetchPage = useCallback(
    async (offset: number, limit: number) => {
      const data = await postApi<BuilderHistoryResponse>("persona/chat/history", {
        token,
        conversation_id: conversationId,
        limit,
        offset,
      });
      const items = data.messages ?? [];
      return { items, total: data.pagination?.total ?? items.length };
    },
    [token, conversationId],
  );

  const pager = useHistoryPager<RawBuilderTurn>(
    token && conversationId ? conversationId : undefined,
    fetchPage,
    HISTORY_PAGE_SIZE,
  );

  // Flatten each turn into its user bubble (if any) then the assistant reply.
  const messages = useMemo<MessageT[]>(() => {
    const out: MessageT[] = [];
    for (const { index, data } of pager.turns) {
      if (data.user_message != null) {
        out.push({
          id: `${conversationId}-h-${index}-u`,
          message: data.user_message,
          userType: "User",
        });
      }
      if (data.response != null) {
        out.push({
          id: `${conversationId}-h-${index}-a`,
          message: data.response,
          userType: "Assistant",
        });
      }
    }
    return out;
  }, [pager.turns, conversationId]);

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

/* ------------------------------------------------------------------ */
/* Chat list (sidebar Recents)                                        */
/* ------------------------------------------------------------------ */

/** A chat as the sidebar Recents list renders it, normalised across kinds. */
export type RecentChat = {
  /** conversation_id (builder) or group_id (group). */
  id: string;
  kind: "builder" | "group";
  /** Route to open the chat. */
  to: string;
  projectId: string;
  title: string;
  status: string;
  /** created_at as epoch ms, for sorting (0 when unknown). */
  createdAt: number;
};

type ChatListResponse = {
  builder_chats: Array<{
    conversation_id: string;
    project_id: string;
    status: string;
    created_at: string | null;
  }>;
  group_chats: Array<{
    group_id: string;
    project_id: string;
    persona_ids: string[];
    status: string;
    created_at: string | null;
  }>;
};

const toEpoch = (iso: string | null): number => (iso ? Date.parse(iso) || 0 : 0);

/**
 * POST /v1/persona/chat-list — the project's builder and group chats.
 *
 * The backend is the source of truth for which chats exist (so Recents survives
 * a hard refresh or a different device). Titles aren't persisted server-side, so
 * we enrich each row with the locally-cached title (e.g. the first-message
 * snippet) when available, falling back to a sensible label otherwise.
 *
 * One-on-one persona chats are intentionally excluded — that flow is disabled on
 * the backend; group chat is the only path to a persona.
 */
export const useChatList = (projectId: string | undefined) => {
  const token = getAuthToken();
  return useQuery<RecentChat[]>({
    queryKey: ["ChatList", projectId],
    queryFn: async () => {
      const data = await postApi<ChatListResponse>("persona/chat-list", {
        token,
        project_id: projectId,
      });

      const items: RecentChat[] = [
        ...(data.builder_chats ?? []).map((c) => ({
          id: c.conversation_id,
          kind: "builder" as const,
          to: `/chat/${c.conversation_id}`,
          projectId: c.project_id,
          title: getSession(c.conversation_id)?.title || "Persona chat",
          status: c.status,
          createdAt: toEpoch(c.created_at),
        })),
        ...(data.group_chats ?? []).map((g) => ({
          id: g.group_id,
          kind: "group" as const,
          to: `/group-chat/${g.group_id}`,
          projectId: g.project_id,
          title:
            getSession(g.group_id)?.title ||
            `Group chat · ${g.persona_ids?.length ?? 0} personas`,
          status: g.status,
          createdAt: toEpoch(g.created_at),
        })),
      ];

      // Newest first.
      items.sort((a, b) => b.createdAt - a.createdAt);
      return items;
    },
    enabled: Boolean(token && projectId),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
};
