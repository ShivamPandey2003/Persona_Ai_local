import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { getAuthToken, postApi } from "@/lib/api";
import { upsertSession } from "@/lib/chatStore";
import { queryClient } from "@/provider";
import { groupAssumptionsKey, groupSuggestionsKey } from "./query";

/* ------------------------------------------------------------------ */
/* Start a group chat                                                 */
/* ------------------------------------------------------------------ */

type StartGroupChatArgs = {
  projectId: string;
  personaIds: string[];
  /** Human-readable label for the Recents list. */
  title: string;
};

type StartGroupChatResponse = {
  group_id: string;
  message: string;
};

/**
 * Start a group chat.
 *
 * The old /group-chat/start endpoint was folded into /group-chat/message —
 * switched by `flow: "start"`, which still returns { group_id, message }.
 *
 * Works for both a single persona and many — group chat is the only chat path
 * to a persona. On success it persists a Recents session and navigates to the
 * group chat route.
 */
export const useStartGroupChat = () => {
  const navigate = useNavigate();
  const token = getAuthToken();

  return useMutation<StartGroupChatResponse, Error, StartGroupChatArgs>({
    mutationKey: ["StartGroupChat"],
    mutationFn: ({ projectId, personaIds }) =>
      postApi<StartGroupChatResponse>("persona/group-chat/message", {
        token,
        flow: "start",
        project_id: projectId,
        persona_ids: personaIds,
      }),
    onSuccess: (data, vars) => {
      upsertSession({
        id: data.group_id,
        kind: "group",
        projectId: vars.projectId,
        title: vars.title,
        personaIds: vars.personaIds,
      });
      // Surface the new group in the sidebar Recents (sourced from chat-list).
      queryClient.invalidateQueries({ queryKey: ["ChatList", vars.projectId] });
      navigate(`/group-chat/${data.group_id}`, {
        state: { projectId: vars.projectId },
      });
    },
  });
};

/* ------------------------------------------------------------------ */
/* Broadcast a message to all personas                                */
/* ------------------------------------------------------------------ */

export type PersonaBroadcastReply = {
  persona_id: string;
  persona_name: string;
  response: string;
  evidence_tags: string[];
  confidence_level?: string | null;
  confidence_score?: number | null;
};

type BroadcastResponse = {
  responses: PersonaBroadcastReply[];
};

/**
 * POST /v1/persona/group-chat/message (flow="message") — every persona replies.
 *
 * `fileIds` are the ids of images already presigned + uploaded for this turn
 * (see {@link uploadGroupImages}); they are attached to the persisted turn.
 */
export const useGroupBroadcast = (groupId: string) => {
  const token = getAuthToken();
  return useMutation<
    BroadcastResponse,
    Error,
    { message: string; fileIds?: string[] }
  >({
    mutationKey: ["GroupBroadcast", groupId],
    mutationFn: ({ message, fileIds }) =>
      postApi<BroadcastResponse>("persona/group-chat/message", {
        token,
        flow: "message",
        group_id: groupId,
        message,
        ...(fileIds && fileIds.length > 0 ? { file_ids: fileIds } : {}),
      }),
  });
};

/* ------------------------------------------------------------------ */
/* Image attachments (server-side / proxy upload)                     */
/* ------------------------------------------------------------------ */

type UploadedImage = {
  file_id: string;
  file_name: string;
  s3_key: string;
};

type ImageUploadResponse = {
  images: UploadedImage[];
  errors: { file_name: string; reason: string }[];
};

/**
 * Upload group-chat images through the backend (proxy upload) and return the
 * `file_id`s to attach to the message.
 *
 * The browser posts the raw bytes as multipart/form-data to
 * /group-chat/image/upload; the server stores them in S3 itself, so no
 * browser→S3 request (and therefore no bucket CORS) is required. Throws a
 * user-facing error if the server rejects any file, so the caller can surface
 * one error and roll back the optimistic message.
 */
export async function uploadGroupImages(
  groupId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return [];

  const token = getAuthToken();
  const form = new FormData();
  form.append("token", token);
  form.append("group_id", groupId);
  files.forEach((f) => form.append("files", f, f.name));

  const data = await postApi<ImageUploadResponse>(
    "persona/group-chat/image/upload",
    form as unknown as Record<string, unknown>,
  );

  const uploaded = data.images ?? [];
  const rejected = data.errors ?? [];

  if (rejected.length > 0) {
    throw new Error(rejected[0]?.reason || "Some images could not be uploaded");
  }
  if (uploaded.length !== files.length) {
    throw new Error("Could not upload all images, please retry");
  }

  return uploaded.map((u) => u.file_id);
}

/* ------------------------------------------------------------------ */
/* Message a single persona within the group                          */
/* ------------------------------------------------------------------ */

type SingleResponse = {
  response: {
    persona_name: string;
    message: string;
    confidence_level?: string | null;
    confidence_score?: number | null;
  };
};

/** POST /v1/persona/group-chat/message-single — drill into one persona. */
export const useGroupMessageSingle = (groupId: string) => {
  const token = getAuthToken();
  return useMutation<
    SingleResponse,
    Error,
    { personaId: string; message: string; fileIds?: string[] }
  >({
    mutationKey: ["GroupMessageSingle", groupId],
    mutationFn: ({ personaId, message, fileIds }) =>
      postApi<SingleResponse>("persona/group-chat/message-single", {
        token,
        group_id: groupId,
        persona_id: personaId,
        message,
        ...(fileIds && fileIds.length > 0 ? { file_ids: fileIds } : {}),
      }),
  });
};

/* ------------------------------------------------------------------ */
/* Shared assumptions / context                                       */
/* ------------------------------------------------------------------ */

/**
 * POST /v1/persona/group-chat/context — replaces the assumptions list wholesale.
 *
 * @deprecated Superseded by the assumption hooks below, which validate each
 * statement, address entries by id, and read the list back from the server.
 * This one applies whatever it is given with no validation. Kept only for
 * callers not yet migrated.
 */
export const useGroupContext = (groupId: string) => {
  const token = getAuthToken();
  return useMutation<Record<string, never>, Error, { assumptions: string[] }>({
    mutationKey: ["GroupContext", groupId],
    mutationFn: ({ assumptions }) =>
      postApi<Record<string, never>>("persona/group-chat/context", {
        token,
        group_id: groupId,
        assumptions,
      }),
  });
};

/* ------------------------------------------------------------------ */
/* Assumptions                                                        */
/* ------------------------------------------------------------------ */

/**
 * POST /v1/persona/group-chat/assumptions/suggest — ask the model to propose
 * assumptions that fit this group's personas.
 *
 * Nothing is stored: each proposal carries a `token` proving the API authored
 * it, and the caller holds the list in component state. Calls are independent —
 * the server keeps no record of earlier ones, so pressing again may return an
 * idea already seen.
 */
export const useSuggestAssumptions = (groupId: string) => {
  const token = getAuthToken();
  // From context, not the module singleton: the cache written here is read back
  // by `useHeldSuggestions`, so both must be the same client.
  const cache = useQueryClient();
  return useMutation<AssumptionSuggestion[], Error, { count?: number } | void>({
    mutationKey: ["SuggestAssumptions", groupId],
    mutationFn: async (vars) => {
      const data = await postApi<{ suggestions: AssumptionSuggestion[] }>(
        "persona/group-chat/assumptions/suggest",
        { token, group_id: groupId, count: vars?.count },
      );
      return data.suggestions ?? [];
    },
    // Each round REPLACES the last: these are this press's ideas, and nothing is
    // carried forward. Written to the cache rather than returned to component
    // state so they outlive the dialog being closed and reopened.
    onSuccess: (fresh) => {
      cache.setQueryData(groupSuggestionsKey(groupId), fresh);
    },
  });
};

type AddAssumptionArgs = {
  /** The statement to apply. */
  text: string;
  /**
   * The signature that came with this text when the API authored it — from
   * /suggest, or as `suggested_token` on a rejection. Omit for text the user
   * typed; it is then validated like any other input.
   */
  suggestionToken?: string | null;
};

/**
 * POST /v1/persona/group-chat/assumptions/add.
 *
 * Resolves for BOTH verdicts: an applied assumption and a rejected one are both
 * successful calls (the backend answers 200 either way, because the rejection
 * reason and its replacement are the useful part). Callers must branch on
 * `result.status` rather than assuming success means applied.
 */
export const useAddAssumption = (groupId: string) => {
  const token = getAuthToken();
  return useMutation<AssumptionVerdict, Error, AddAssumptionArgs>({
    mutationKey: ["AddAssumption", groupId],
    mutationFn: ({ text, suggestionToken }) =>
      postApi<AssumptionVerdict>("persona/group-chat/assumptions/add", {
        token,
        group_id: groupId,
        text,
        suggestion_token: suggestionToken ?? undefined,
      }),
    onSuccess: (result) => {
      // Only an applied assumption changes the stored list.
      if (result.status === "approved") {
        queryClient.invalidateQueries({ queryKey: groupAssumptionsKey(groupId) });
      }
    },
  });
};

/** POST /v1/persona/group-chat/assumptions/remove — stops it shaping replies. */
export const useRemoveAssumption = (groupId: string) => {
  const token = getAuthToken();
  return useMutation<{ assumption_id: string }, Error, { assumptionId: string }>({
    mutationKey: ["RemoveAssumption", groupId],
    mutationFn: ({ assumptionId }) =>
      postApi<{ assumption_id: string }>("persona/group-chat/assumptions/remove", {
        token,
        group_id: groupId,
        assumption_id: assumptionId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupAssumptionsKey(groupId) });
    },
  });
};
