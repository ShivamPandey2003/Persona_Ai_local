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

import { useBuilderHistory } from "@/api/Chat/query";
import { useBuilderChatMessage } from "@/api/Chat/mutation";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { useLoadOlderOnScroll } from "@/hooks/useLoadOlderOnScroll";
import { touchSession } from "@/lib/chatStore";
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
  // Set once the agent returns final_result: personas are built and the backend
  // has closed the conversation, so no further messages are accepted.
  const [ended, setEnded] = useState(false);

  const messageMut = useBuilderChatMessage(conversationId ?? "");

  const messages = useMemo(
    () => [...history.messages, ...liveMessages],
    [history.messages, liveMessages],
  );

  // Reset local state when switching between conversations.
  useEffect(() => {
    setLiveMessages([]);
    setEnded(false);
  }, [conversationId]);

  // Scroll-up loads older history while keeping the viewport anchored.
  const stbRef = useRef<StickToBottomContext | null>(null);
  const getScrollEl = useCallback(
    () => stbRef.current?.scrollRef.current ?? null,
    [],
  );
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
    setEnded(true);
    if (conversationId) touchSession(conversationId, { ended: true });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ["PersonaList", projectId] });
      queryClient.invalidateQueries({ queryKey: ["PersonaDashboard", projectId] });
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
          if (/ended/i.test(err.message)) setEnded(true);
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

      {ended && (
        <p className="mx-auto w-full max-w-3xl px-5 pb-1 text-center text-xs text-muted-foreground">
          This conversation has ended.
        </p>
      )}

      <ChatComposer
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
