import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import { Users } from "lucide-react";
import { toast } from "sonner";
import type { StickToBottomContext } from "use-stick-to-bottom";

import { MessageComponent } from "./Message";
import LoadingMessage from "./LoadingMessage";
import ErrorMessage from "./ErrorMessage";
import ChatComposer from "./ChatComposer";
import ChatHistorySkeleton from "./ChatHistorySkeleton";
import ChatScrollButton from "./ChatScrollButton";
import { Button } from "@/components/ui/button";
import { GradientRingLoader } from "@/components/ui/loader";

import { useBuilderHistory, useChatList } from "@/api/Chat/query";
import { useBuilderChatMessage } from "@/api/Chat/mutation";
import ChatEnded from "@/components/common/Chat/ChatEnded";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { useLoadOlderOnScroll } from "@/hooks/useLoadOlderOnScroll";
import { getSession, touchSession } from "@/lib/chatStore";
import { cn } from "@/lib/utils";
import { setPersonaDialog } from "@/redux/ProjectSlice";
import type { AppDispatch } from "@/redux/store";
import { queryClient } from "@/provider";

function snippet(text: string, words = 6): string {
  return text.split(/\s+/).slice(0, words).join(" ");
}

function ConversationPromptInput() {
  const { id: conversationId } = useParams();
  const projectId = useActiveProjectId();
  const dispatch = useDispatch<AppDispatch>();
  const history = useBuilderHistory(conversationId);
  const [liveMessages, setLiveMessages] = useState<MessageT[]>([]);
  const [input, setInput] = useState("");
  const [endedLocal, setEndedLocal] = useState(false);

  const messageMut = useBuilderChatMessage(conversationId ?? "");

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

  const liveIds = useMemo(
    () => new Set(liveMessages.map((m) => m.id)),
    [liveMessages],
  );

  useEffect(() => {
    setLiveMessages([]);
    setEndedLocal(false);
  }, [conversationId]);

  const stbRef = useRef<StickToBottomContext | null>(null);
  const getScrollEl = useCallback(
    () => stbRef.current?.scrollRef.current ?? null,
    [],
  );

  const composerRef = useRef<HTMLDivElement>(null);
  const handleEditMessage = useCallback((text: string) => {
    setInput(text);
    requestAnimationFrame(() => {
      const textarea = composerRef.current?.querySelector("textarea");
      if (textarea) {
        textarea.focus();
        const end = text.length;
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

  const finishConversation = () => {
    setEndedLocal(true);
    if (conversationId) touchSession(conversationId, { ended: true });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ["PersonaList", projectId] });
      queryClient.invalidateQueries({ queryKey: ["PersonaDashboard", projectId] });
      queryClient.invalidateQueries({ queryKey: ["ChatList", projectId] });
    }
    toast.success("Your personas are ready!");
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
           if (isFirstUserMessage) {
            touchSession(conversationId, { title: snippet(text) });
            if (projectId) {
              queryClient.invalidateQueries({ queryKey: ["ChatList", projectId] });
            }
          }
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
    <div className="flex h-[calc(100vh-90px)] flex-col overflow-hidden duration-300 animate-in fade-in">
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
          className={cn(
            "shrink-0",
            ended &&
              "border-primary/40 text-primary animate-[success-pulse_1.4s_ease-out_infinite]",
          )}
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
              <GradientRingLoader size="sm" />
            </div>
          )}

          {history.isInitialLoading && <ChatHistorySkeleton />}

          {messages.map((message, index) => (
            <MessageComponent
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
              onEdit={ended ? undefined : handleEditMessage}
              animate={liveIds.has(message.id)}
            />
          ))}

          {messageMut.isPending && <LoadingMessage />}
          {history.isError && (
            <ErrorMessage
              error={{
                name: "HistoryError",
                message: "Couldn't load this conversation.",
              }}
            />
          )}

          <ChatScrollButton />
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
