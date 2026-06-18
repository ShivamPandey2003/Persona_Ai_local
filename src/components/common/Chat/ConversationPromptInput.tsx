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
import PersonaBuildProgress from "./PersonaBuildProgress";
import { Button } from "@/components/ui/button";
import { GradientRingLoader } from "@/components/ui/loader";

import { useBuilderHistory, useChatList } from "@/api/Chat/query";
import { useBuilderChatMessage } from "@/api/Chat/mutation";
import type { RunQueryPersona } from "@/api/Persona/query";
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
  // persona_query job id while the "Building Your Personas…" loader runs.
  const [queryJobId, setQueryJobId] = useState<string | null>(null);
  // True only once the job finished AND produced real study/evidence data —
  // drives the celebratory pulse on the "View Personas" button.
  const [personasReady, setPersonasReady] = useState(false);

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
    setPersonasReady(false);
    // Resume the build progress if the user left while a job was still running.
    setQueryJobId(getSession(conversationId)?.queryJobId ?? null);
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

  const openPersonaPanel = useCallback(
    () => dispatch(setPersonaDialog(true)),
    [dispatch],
  );

  const invalidatePersonas = useCallback(() => {
    if (!projectId) return;
    queryClient.invalidateQueries({ queryKey: ["PersonaList", projectId] });
    queryClient.invalidateQueries({ queryKey: ["PersonaDashboard", projectId] });
    queryClient.invalidateQueries({ queryKey: ["ChatList", projectId] });
  }, [projectId]);

  /** Mark the builder conversation ended (no further messages accepted). */
  const markEnded = useCallback(() => {
    setEndedLocal(true);
    if (conversationId) touchSession(conversationId, { ended: true });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ["ChatList", projectId] });
    }
  }, [conversationId, projectId]);

  /** persona_query job finished: refresh personas and open the dashboard. The
   * celebratory pulse only fires when run_query actually produced study/evidence
   * data for at least one persona. */
  const handleBuildComplete = useCallback(
    (personas: RunQueryPersona[] = []) => {
      if (conversationId) touchSession(conversationId, { queryJobId: null });
      setQueryJobId(null);
      const hasData = personas.some(
        (p) =>
          (p.study_summary?.length ?? 0) > 0 ||
          (p.final_evidence_by_category?.length ?? 0) > 0,
      );
      setPersonasReady(hasData);
      invalidatePersonas();
      toast.success("Your personas are ready!");
      openPersonaPanel();
    },
    [conversationId, invalidatePersonas, openPersonaPanel],
  );

  /** persona_query job failed: personas exist but without run_query evidence. */
  const handleBuildError = useCallback(() => {
    if (conversationId) touchSession(conversationId, { queryJobId: null });
    invalidatePersonas();
    toast.error("Personas were built, but analysing their data didn't finish.");
  }, [conversationId, invalidatePersonas]);

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
          // building_persona === 1 => requirements done, personas persisted, and
          // the backend kicked off run_query as a background job. Show the loader
          // and poll the job; open the dashboard on completion. When no job_id
          // comes back, open the dashboard immediately.
          if (data.building_persona === 1) {
            markEnded();
            if (data.job_id) {
              touchSession(conversationId, { queryJobId: data.job_id });
              setQueryJobId(data.job_id);
            } else {
              handleBuildComplete();
            }
          }
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
          {queryJobId
            ? "Building personas…"
            : ended
              ? "Personas ready"
              : "Persona Builder"}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={openPersonaPanel}
          className={cn(
            "shrink-0",
            personasReady &&
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

          {/* Live build progress once requirements are complete. */}
          {queryJobId && (
            <PersonaBuildProgress
              jobId={queryJobId}
              onComplete={handleBuildComplete}
              onError={handleBuildError}
              onViewPersonas={openPersonaPanel}
            />
          )}

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
