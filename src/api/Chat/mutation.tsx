import { useMutation } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Start a persona-builder conversation                               */
/* ------------------------------------------------------------------ */

/** One message in a builder turn (backend shape: { role, content }). */
export type BuilderChatMessageT = {
  role: string;
  content: string;
};

/** A single built persona — one entry of final_result.personas. */
export type BuilderPersona = {
  persona_index: number | null;
  industry: string | null;
  category: string | null;
  sub_category_id: string | null;
  micro_category: string[] | null;
  construct_ids: string[] | null;
  role_type_ids: string[] | null;
  timeframe_ids: string[] | null;
  entity_scope_ids: string[] | null;
  theme_ids: string[] | null;
  profile_ids: string[] | null;
  demographics: Record<string, string | null> | null;
};

/** Personas produced once requirements are complete; null until then. */
export type BuilderFinalResult = { personas: BuilderPersona[] } | null;

/**
 * Unified response of POST /v1/persona/chat/message, returned for both
 * flow="start" and flow="message":
 *   - id           : conversation_id (route / persist the session with it)
 *   - messages     : the assistant's reply for this turn ({ role, content })
 *   - final_result : built personas once the agent finishes, else null
 */
export type BuilderChatTurnResponse = {
  id: string;
  messages: BuilderChatMessageT[];
  final_result: BuilderFinalResult;
};

/**
 * Start a builder conversation (flow="start").
 *
 * The old /chat/start endpoint was folded into /chat/message. The opening
 * assistant question arrives in `messages`; `final_result` is null on the
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
