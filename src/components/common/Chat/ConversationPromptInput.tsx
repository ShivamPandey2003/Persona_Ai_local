import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import { Users } from "lucide-react";
import type { StickToBottomContext } from "use-stick-to-bottom";

import { MessageComponent } from "./Message";
import LoadingMessage from "./LoadingMessage";
import ErrorMessage from "./ErrorMessage";
import ChatComposer from "./ChatComposer";
import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";

import { useBuilderHistory, useChatList } from "@/api/Chat/query";
import { useBuilderChatMessage } from "@/api/Chat/mutation";
import ChatEnded from "@/components/common/Chat/ChatEnded";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { useLoadOlderOnScroll } from "@/hooks/useLoadOlderOnScroll";
import { getSession, touchSession } from "@/lib/chatStore";
import { setPersonaDialog } from "@/redux/ProjectSlice";
import type { AppDispatch } from "@/redux/store";
import { queryClient } from "@/provider";

function snippet(text: string, words = 6): string {
  return text.split(/\s+/).slice(0, words).join(" ");
}

/**
 * Persona-builder conversation (route /chat/:id).
 *
 * Rehydrates the transcript from history (newest window first, older windows
 * loaded on scroll-up) and lets the user keep describing personas. "End & View
 * Personas" closes the conversation, generates personas for the project (dummy
 * data; idempotent), and opens the persona panel. The conversation is always
 * created upstream by ChatEntry, so this view never starts one itself.
 */
function ConversationPromptInput() {
  const { id: conversationId } = useParams();
  const projectId = useActiveProjectId();
  const dispatch = useDispatch<AppDispatch>();

  // History is owned by the pager (grows at the front on scroll-up); messages
  // sent in this session are appended locally at the end.
  const history = useBuilderHistory(conversationId);
  const [liveMessages, setLiveMessages] = useState<MessageT[]>([]);
  const [input, setInput] = useState("");
  // Local "ended" transitions during this session: the agent returns
  // final_result (personas built) or the backend rejects a message because the
  // conversation is already closed.
  const [endedLocal, setEndedLocal] = useState(false);

  const messageMut = useBuilderChatMessage(conversationId ?? "");

  // The backend chat-list is the durable source of truth for an ended
  // conversation (builder chat status is "active" | "ended"). It survives logout
  // — which clears localStorage — and hard refreshes, unlike the local session
  // flag. OR-ing all three keeps the ended state correct both immediately on
  // completion and after logging back in.
  const { data: chatList } = useChatList(projectId);
  const serverEnded = useMemo(
    () =>
      chatList?.some(
        (c) =>
          c.kind === "builder" &&
          c.id === conversationId &&
          c.status?.toLowerCase() === "ended",
      ) ?? false,
    [chatList, conversationId],
  );
  const ended =
    endedLocal || serverEnded || (getSession(conversationId)?.ended ?? false);

  const messages = useMemo(
    () => [...history.messages, ...liveMessages],
    [history.messages, liveMessages],
  );

  // Reset live state when switching conversations. The derived `ended` value
  // (server status / session flag) recomputes on its own, so only the local
  // session-scoped flag needs clearing here.
  useEffect(() => {
    setLiveMessages([]);
    setEndedLocal(false);
  }, [conversationId]);

  // Scroll-up loads older history while keeping the viewport anchored.
  const stbRef = useRef<StickToBottomContext | null>(null);
  const getScrollEl = useCallback(
    () => stbRef.current?.scrollRef.current ?? null,
    [],
  );

  // Edit: load a previous message's text back into the composer, then focus the
  // textarea (caret at the end) so it can be tweaked and re-sent.
  const composerRef = useRef<HTMLDivElement>(null);
  const handleEditMessage = useCallback((text: string) => {
    setInput(text);
    requestAnimationFrame(() => {
      const textarea = composerRef.current?.querySelector("textarea");
      if (textarea) {
        textarea.focus();
        const end = textarea.value.length;
        textarea.setSelectionRange(end, end);
      }
    });
  }, []);
  useLoadOlderOnScroll({
    getScrollEl,
    ready: history.ready,
    hasOlder: history.hasOlder,
    isLoadingOlder: history.isLoadingOlder,
    loadOlder: history.loadOlder,
    signal: history.messages.length,
  });

  const openPersonaPanel = () => dispatch(setPersonaDialog(true));

  // Once the agent returns final_result, the personas are built and the backend
  // has already closed the conversation. Reflect that locally, refresh the
  // persona panel queries, and open the panel automatically — there is no
  // manual "end" step.
  const finishConversation = () => {
    setEndedLocal(true);
    if (conversationId) touchSession(conversationId, { ended: true });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ["PersonaList", projectId] });
      queryClient.invalidateQueries({ queryKey: ["PersonaDashboard", projectId] });
      // Refresh chat-list so the durable ended status is reflected everywhere.
      queryClient.invalidateQueries({ queryKey: ["ChatList", projectId] });
    }
    openPersonaPanel();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || !conversationId || ended || messageMut.isPending) return;

    const isFirstUserMessage = !messages.some((m) => m.userType === "User");
    setInput("");
    setLiveMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), userType: "User", message: text },
    ]);

    messageMut.mutate(
      { message: text },
      {
        onSuccess: (data) => {
          setLiveMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              userType: "Assistant",
              message: data.messages?.[0]?.content ?? "",
            },
          ]);
          touchSession(conversationId, {
            title: isFirstUserMessage ? snippet(text) : undefined,
          });
          // final_result present => build complete: auto-end + show personas.
          if (data.final_result) finishConversation();
        },
        onError: (err) => {
          if (/ended/i.test(err.message)) {
            setEndedLocal(true);
            // Cache locally too; the backend chat-list status remains the
            // durable source after logout.
            if (conversationId) touchSession(conversationId, { ended: true });
          }
        },
      },
    );
  };

  return (
    <div className="flex h-[calc(100vh-90px)] flex-col overflow-hidden">
      {/* Toolbar: status + a shortcut to the personas dashboard. Personas also
          open automatically once the build completes. */}
      <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between gap-4 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {ended ? "Personas ready" : "Persona Builder"}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={openPersonaPanel}
          className="shrink-0"
        >
          <Users className="mr-1.5 h-4 w-4" />
          View Personas
        </Button>
      </div>

      <ChatContainerRoot
        contextRef={stbRef}
        className="relative flex-1 space-y-0 overflow-hidden"
      >
        <ChatContainerContent className="space-y-12 py-8">
          {/* Top-of-list spinner while older history loads. */}
          {history.isLoadingOlder && (
            <div className="flex justify-center py-2">
              <CircularLoader size="sm" />
            </div>
          )}

          {messages.map((message, index) => (
            <MessageComponent
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
              onEdit={ended ? undefined : handleEditMessage}
            />
          ))}

          {(history.isInitialLoading || messageMut.isPending) && <LoadingMessage />}
          {history.isError && (
            <ErrorMessage
              error={{
                name: "HistoryError",
                message: "Couldn't load this conversation.",
              }}
            />
          )}
        </ChatContainerContent>
      </ChatContainerRoot>

      {ended && <ChatEnded message="This conversation has ended." />}

      <ChatComposer
        rootRef={composerRef}
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        disabled={ended}
        isSending={messageMut.isPending}
        placeholder="Describe your target persona…"
      />
    </div>
  );
}

export default ConversationPromptInput;
