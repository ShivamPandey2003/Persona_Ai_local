import { useMutation } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Start a persona-builder conversation                               */
/* ------------------------------------------------------------------ */

type BuilderStartResponse = {
  conversation_id: string;
  first_message: string;
};

/** POST /v1/persona/chat/start. */
export const useBuilderChatStart = () => {
  const token = getAuthToken();
  return useMutation<BuilderStartResponse, Error, { projectId: string }>({
    mutationKey: ["BuilderChatStart"],
    mutationFn: ({ projectId }) =>
      postApi<BuilderStartResponse>("persona/chat/start", {
        token,
        project_id: projectId,
      }),
  });
};

/* ------------------------------------------------------------------ */
/* Send a message in a builder conversation                           */
/* ------------------------------------------------------------------ */

export type BuilderMessageResponse = {
  assistant_message: string;
  persona_progress: PersonaProgressT;
};

/** POST /v1/persona/chat/message. */
export const useBuilderChatMessage = (conversationId: string) => {
  const token = getAuthToken();
  return useMutation<BuilderMessageResponse, Error, { message: string }>({
    mutationKey: ["BuilderChatMessage", conversationId],
    mutationFn: ({ message }) =>
      postApi<BuilderMessageResponse>("persona/chat/message", {
        token,
        conversation_id: conversationId,
        message,
      }),
  });
};

/* ------------------------------------------------------------------ */
/* End a builder conversation                                         */
/* ------------------------------------------------------------------ */

/** POST /v1/persona/chat/end. */
export const useBuilderChatEnd = (conversationId: string) => {
  const token = getAuthToken();
  return useMutation<Record<string, never>, Error, void>({
    mutationKey: ["BuilderChatEnd", conversationId],
    mutationFn: () =>
      postApi<Record<string, never>>("persona/chat/end", {
        token,
        conversation_id: conversationId,
      }),
  });
};
