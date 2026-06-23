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
};

type BroadcastResponse = {
  responses: PersonaBroadcastReply[];
};

/** POST /v1/persona/group-chat/message (flow="message") — every persona replies. */
export const useGroupBroadcast = (groupId: string) => {
  const token = getAuthToken();
  return useMutation<BroadcastResponse, Error, { message: string }>({
    mutationKey: ["GroupBroadcast", groupId],
    mutationFn: ({ message }) =>
      postApi<BroadcastResponse>("persona/group-chat/message", {
        token,
        flow: "message",
        group_id: groupId,
        message,
      }),
  });
};

/* ------------------------------------------------------------------ */
/* Message a single persona within the group                          */
/* ------------------------------------------------------------------ */

type SingleResponse = {
  response: {
    persona_name: string;
    message: string;
  };
};

/** POST /v1/persona/group-chat/message-single — drill into one persona. */
export const useGroupMessageSingle = (groupId: string) => {
  const token = getAuthToken();
  return useMutation<
    SingleResponse,
    Error,
    { personaId: string; message: string }
  >({
    mutationKey: ["GroupMessageSingle", groupId],
    mutationFn: ({ personaId, message }) =>
      postApi<SingleResponse>("persona/group-chat/message-single", {
        token,
        group_id: groupId,
        persona_id: personaId,
        message,
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
