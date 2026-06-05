import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import { Sparkles } from "lucide-react";

import { MessageComponent } from "./Message";
import LoadingMessage from "./LoadingMessage";
import ErrorMessage from "./ErrorMessage";
import ChatComposer from "./ChatComposer";
import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";

import { useBuilderChatHistory } from "@/api/Chat/query";
import { useBuilderChatMessage, useBuilderChatEnd } from "@/api/Chat/mutation";
import { usePersonaGenerate } from "@/api/Persona/mutation";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
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
 * Rehydrates the transcript from history and lets the user keep describing
 * personas. "End & View Personas" closes the conversation, generates personas
 * for the project (dummy data; idempotent), and opens the persona panel. The
 * conversation is always created upstream by ChatEntry, so this view never
 * starts one itself.
 */
function ConversationPromptInput() {
  const { id: conversationId } = useParams();
  const projectId = useActiveProjectId();
  const dispatch = useDispatch<AppDispatch>();

  const [messages, setMessages] = useState<MessageT[]>([]);
  const [input, setInput] = useState("");
  const [progress, setProgress] = useState<PersonaProgressT | null>(null);
  const [ended, setEnded] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const hydratedRef = useRef(false);

  const historyQuery = useBuilderChatHistory(conversationId);
  const messageMut = useBuilderChatMessage(conversationId ?? "");
  const endMut = useBuilderChatEnd(conversationId ?? "");
  const generateMut = usePersonaGenerate();

  // Reset local state when switching between conversations.
  useEffect(() => {
    hydratedRef.current = false;
    setMessages([]);
    setProgress(null);
    setEnded(false);
  }, [conversationId]);

  // Seed the transcript from history once per conversation.
  useEffect(() => {
    if (!historyQuery.data || hydratedRef.current) return;
    hydratedRef.current = true;
    setMessages(historyQuery.data);
  }, [historyQuery.data]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !conversationId || ended || messageMut.isPending) return;

    const isFirstUserMessage = !messages.some((m) => m.userType === "User");
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), userType: "User", message: text },
    ]);

    messageMut.mutate(
      { message: text },
      {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              userType: "Assistant",
              message: data.assistant_message,
              persona_progress: data.persona_progress,
            },
          ]);
          setProgress(data.persona_progress);
          touchSession(conversationId, {
            title: isFirstUserMessage ? snippet(text) : undefined,
          });
        },
        onError: (err) => {
          if (/ended/i.test(err.message)) setEnded(true);
        },
      },
    );
  };

  const openPersonaPanel = () => dispatch(setPersonaDialog(true));

  // End the builder chat, ensure the project has personas (generates a dummy
  // set on first run; idempotent thereafter), refresh the panel queries, then
  // open the persona panel so the user can start single/group chats.
  const handleEnd = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      if (conversationId && !ended) {
        try {
          await endMut.mutateAsync();
        } catch {
          // Ending may fail if already ended — proceed to personas regardless.
        }
        setEnded(true);
        touchSession(conversationId, { ended: true });
      }

      if (projectId) {
        try {
          await generateMut.mutateAsync({ projectId });
        } catch {
          // Generation errors are surfaced via toast; still open the panel.
        }
        queryClient.invalidateQueries({ queryKey: ["PersonaList", projectId] });
        queryClient.invalidateQueries({ queryKey: ["PersonaDashboard", projectId] });
      }

      openPersonaPanel();
    } finally {
      setFinishing(false);
    }
  };

  const isHistoryLoading = historyQuery.isLoading;
  const completion = progress?.completion ?? 0;

  return (
    <div className="flex h-[calc(100vh-90px)] flex-col overflow-hidden">
      {/* Toolbar: progress + end */}
      <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between gap-4 px-4 py-2">
        {progress ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              Persona {progress.persona_number}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
              {completion}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Persona Builder</span>
        )}
        <Button
          size="sm"
          variant={completion >= 100 ? "default" : "outline"}
          onClick={handleEnd}
          disabled={finishing}
          className="shrink-0"
        >
          {finishing ? (
            <CircularLoader size="sm" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          {finishing
            ? "Generating personas…"
            : ended
              ? "View Personas"
              : "End & View Personas"}
        </Button>
      </div>

      <ChatContainerRoot className="relative flex-1 space-y-0 overflow-hidden">
        <ChatContainerContent className="space-y-12 py-8">
          {messages.map((message, index) => (
            <MessageComponent
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
            />
          ))}

          {(isHistoryLoading || messageMut.isPending) && <LoadingMessage />}
          {historyQuery.isError && (
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
