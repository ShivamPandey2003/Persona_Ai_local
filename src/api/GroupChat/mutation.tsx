import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { getAuthToken, postApi } from "@/lib/api";
import { upsertSession } from "@/lib/chatStore";
import { queryClient } from "@/provider";

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

/** POST /v1/persona/group-chat/context — replaces the assumptions list. */
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
