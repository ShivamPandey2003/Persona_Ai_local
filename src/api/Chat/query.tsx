import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";
import { getSession } from "@/lib/chatStore";
import { useHistoryPager } from "@/hooks/useHistoryPager";
import type { PersonaBuildStep } from "@/api/Persona/query";

/**
 * History is stored one turn per row: a single `user_message` (null for the
 * opening turn) paired with the assistant `response`. The view renders one
 * bubble per speaker, so each turn is flattened into up to two MessageT entries.
 */
type RawBuilderTurn = {
  user_message: string | null;
  response: string | null;
};

/**
 * Snapshot of the persona-build background job tied to this conversation,
 * returned by /chat/history on the newest page. Lets the transcript render the
 * build's progress/outcome permanently (and resume polling if still running),
 * instead of the loader vanishing once the live session ends. Absent for chats
 * that never kicked off a build.
 */
export type BuilderBuildSnapshot = {
  job_id: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  steps: PersonaBuildStep[] | null;
};

type BuilderHistoryResponse = {
  messages: RawBuilderTurn[];
  pagination?: Pagination;
  build?: BuilderBuildSnapshot | null;
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

  // Build snapshot lives on the newest page (offset 0) only. Captured here as the
  // pager fetches that page, and reset when the conversation changes so a stale
  // build from the previous chat never leaks in before the new fetch resolves.
  const [build, setBuild] = useState<BuilderBuildSnapshot | null>(null);
  useEffect(() => setBuild(null), [conversationId]);

  const fetchPage = useCallback(
    async (offset: number, limit: number) => {
      const data = await postApi<BuilderHistoryResponse>("persona/chat/history", {
        token,
        conversation_id: conversationId,
        limit,
        offset,
      });
      if (offset === 0) setBuild(data.build ?? null);
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
    build,
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
  /** created_at as epoch ms (0 when unknown). */
  createdAt: number;
  /**
   * Last-activity time as epoch ms — the newest message in the chat, or its
   * creation time when it has no messages yet. Recents are ordered by this so
   * the chat a user most recently interacted with floats to the top.
   */
  updatedAt: number;
};

type ChatListResponse = {
  builder_chats: Array<{
    conversation_id: string;
    project_id: string;
    status: string;
    title: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>;
  group_chats: Array<{
    group_id: string;
    project_id: string;
    persona_ids: string[];
    status: string;
    title: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>;
};

const toEpoch = (iso: string | null): number => (iso ? Date.parse(iso) || 0 : 0);

/**
 * POST /v1/persona/chat-list — the project's builder and group chats.
 *
 * The backend is the source of truth for which chats exist (so Recents survives
 * a hard refresh or a different device) and now for their titles too: a title is
 * auto-generated server-side after the first turn and can be renamed. We fall
 * back to the locally-cached title (e.g. an optimistic first-message snippet)
 * until the server title lands, then to a sensible default label.
 *
 * Rows are ordered by `updated_at` (last-activity time) so the most recently
 * used chat is first.
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
        ...(data.builder_chats ?? []).map((c) => {
          const createdAt = toEpoch(c.created_at);
          return {
            id: c.conversation_id,
            kind: "builder" as const,
            to: `/chat/${c.conversation_id}`,
            projectId: c.project_id,
            title:
              c.title || getSession(c.conversation_id)?.title || "Persona chat",
            status: c.status,
            createdAt,
            updatedAt: toEpoch(c.updated_at) || createdAt,
          };
        }),
        ...(data.group_chats ?? []).map((g) => {
          const createdAt = toEpoch(g.created_at);
          return {
            id: g.group_id,
            kind: "group" as const,
            to: `/group-chat/${g.group_id}`,
            projectId: g.project_id,
            title:
              g.title ||
              getSession(g.group_id)?.title ||
              `Group chat · ${g.persona_ids?.length ?? 0} personas`,
            status: g.status,
            createdAt,
            updatedAt: toEpoch(g.updated_at) || createdAt,
          };
        }),
      ];

      // Most-recent activity first; fall back to creation time on ties.
      items.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
      return items;
    },
    enabled: Boolean(token && projectId),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
};
