import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAuthToken, postApi } from "@/lib/api";
import { touchSession, type ChatKind } from "@/lib/chatStore";
import { queryClient } from "@/provider";

/* ------------------------------------------------------------------ */
/* Start a persona-builder conversation                               */
/* ------------------------------------------------------------------ */

/** One message in a builder turn (backend shape: { role, content }). */
export type BuilderChatMessageT = {
  role: string;
  content: string;
};

/**
 * Unified response of POST /v1/persona/chat/message, returned for both
 * flow="start" and flow="message":
 *   - id              : conversation_id (route / persist the session with it)
 *   - messages        : the assistant's reply for this turn ({ role, content })
 *   - building_persona: 1 when finishing the build kicked off the run_query
 *                       background job (else 0). When 1, `job_id` is present.
 *   - job_id          : the persona_query job to poll (see usePersonaBuildJob)
 *                       for the study/evidence results; absent unless building.
 */
export type BuilderChatTurnResponse = {
  id: string;
  messages: BuilderChatMessageT[];
  building_persona: number;
  job_id?: string | null;
};

/**
 * Start a builder conversation (flow="start").
 *
 * The old /chat/start endpoint was folded into /chat/message. The opening
 * assistant question arrives in `messages`; `building_persona` is 0 on the
 * opening turn.
 */
export const useBuilderChatStart = () => {
  const token = getAuthToken();
  return useMutation<BuilderChatTurnResponse, Error, { projectId: string }>({
    mutationKey: ["BuilderChatStart"],
    mutationFn: ({ projectId }) =>
      postApi<BuilderChatTurnResponse>("persona/chat/message", {
        token,
        flow: "start",
        project_id: projectId,
      }),
  });
};

/* ------------------------------------------------------------------ */
/* Send a message in a builder conversation                           */
/* ------------------------------------------------------------------ */

/** POST /v1/persona/chat/message — a normal builder turn (flow="message"). */
export const useBuilderChatMessage = (conversationId: string) => {
  const token = getAuthToken();
  return useMutation<BuilderChatTurnResponse, Error, { message: string }>({
    mutationKey: ["BuilderChatMessage", conversationId],
    mutationFn: ({ message }) =>
      postApi<BuilderChatTurnResponse>("persona/chat/message", {
        token,
        flow: "message",
        conversation_id: conversationId,
        message,
      }),
  });
};

/* ------------------------------------------------------------------ */
/* Rename a chat (builder or group)                                   */
/* ------------------------------------------------------------------ */

type RenameChatArgs = {
  /** conversation_id (builder) or group_id (group). */
  chatId: string;
  /** Which store the chat lives in; sent verbatim as the backend chat_type. */
  chatType: ChatKind;
  /** New title — already trimmed and length-validated by the caller. */
  title: string;
  /** Project whose Recents list should refresh on success. */
  projectId: string;
};

/**
 * POST /v1/persona/chat/rename — set a chat's display title.
 *
 * One endpoint renames both builder conversations and group chats; the backend
 * routes on `chat_type`. On success we refresh the project's Recents list (so
 * the new title shows immediately, and re-sorts if needed) and mirror the title
 * into the local chat store, which the list uses as an optimistic fallback.
 *
 * `postApi` already surfaces a toast and throws for error envelopes, so callers
 * only need to handle the success path.
 */
export const useRenameChat = () => {
  const token = getAuthToken();
  return useMutation<Record<string, never>, Error, RenameChatArgs>({
    mutationKey: ["RenameChat"],
    mutationFn: ({ chatId, chatType, title }) =>
      postApi<Record<string, never>>("persona/chat/rename", {
        token,
        chat_id: chatId,
        chat_type: chatType,
        title,
      }),
    onSuccess: (_data, { chatId, title, projectId }) => {
      touchSession(chatId, { title });
      queryClient.invalidateQueries({ queryKey: ["ChatList", projectId] });
      toast.success("Chat renamed");
    },
  });
};
