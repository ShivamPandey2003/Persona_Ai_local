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
