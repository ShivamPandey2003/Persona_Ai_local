import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import { Database, Users } from "lucide-react";
import { toast } from "sonner";
import type { StickToBottomContext } from "use-stick-to-bottom";

import { MessageComponent } from "./Message";
import LoadingMessage from "./LoadingMessage";
import ErrorMessage from "./ErrorMessage";
import ChatComposer from "./ChatComposer";
import ChatHistorySkeleton from "./ChatHistorySkeleton";
import ChatScrollButton from "./ChatScrollButton";
import PersonaBuildProgress from "./PersonaBuildProgress";
import DataSourceControl from "./DataSourceControl";
import { Button } from "@/components/ui/button";
import { GradientRingLoader } from "@/components/ui/loader";

import { useBuilderHistory, useChatList } from "@/api/Chat/query";
import { useBuilderChatMessage } from "@/api/Chat/mutation";
import { projectDataStateKey } from "@/api/Projects/dataFiles";
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
  // persona_query job whose build card is shown in the transcript. Set while the
  // build runs AND kept after it settles, so the outcome (success/failure + the
  // steps) stays in the chat history instead of vanishing. Sourced live from the
  // send response, or rehydrated from history.build when the chat is reopened.
  const [queryJobId, setQueryJobId] = useState<string | null>(null);
  // True only while a build is actually in flight (this session, or a still-
  // running one we resumed). Gates the celebratory toast + auto-open dashboard so
  // reopening a long-finished build never re-announces it.
  const [buildAnnounce, setBuildAnnounce] = useState(false);
  // True only once the job finished AND produced real study/evidence data —
  // drives the celebratory pulse on the "View Personas" button.
  const [personasReady, setPersonasReady] = useState(false);
  // The data-source dialog is opened from two places — the toolbar chip and the
  // prompt above the composer — so its open state lives here rather than inside
  // the chip.
  const [pickerOpen, setPickerOpen] = useState(false);
  // Set to this conversation once its first user turn is sent — the turn that
  // makes the backend name the chat. While set, the Recents list polls for that
  // name so the entry renames itself instead of waiting for a page reload.
  const [awaitingTitle, setAwaitingTitle] = useState<string | null>(null);

  const messageMut = useBuilderChatMessage(conversationId ?? "");

  const { data: chatList } = useChatList(projectId, {
    awaitTitleFor: awaitingTitle ?? undefined,
  });
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

  // The composer stays locked until the user says which data to build from. The
  // choice decides what every persona here is evidenced from and freezes when
  // the build dispatches, so it has to be made before any requirements are
  // gathered — asking afterwards would mean redoing the conversation. The
  // backend refuses these turns too; this only keeps the user from typing into
  // a box that would reject them. Held back until history has loaded so a chat
  // that HAS a source never flashes the prompt on open.
  const needsDataSource =
    !ended && history.ready && !history.isInitialLoading && !history.dataSourceSelected;

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
    // Start clean; the build card is re-sourced from history.build below (durable
    // and cross-device), so a still-running build resumes once history loads.
    setQueryJobId(null);
    setBuildAnnounce(false);
    setAwaitingTitle(null);
  }, [conversationId]);

  // Rehydrate the build card from the persisted snapshot: resume polling if it's
  // still running, or show the final done/failed card permanently. Only announce
  // for a build still in flight — one that already settled before this load is
  // history, not a fresh completion, so it must not re-toast / re-open the panel.
  useEffect(() => {
    const b = history.build;
    if (!b) return;
    setQueryJobId(b.job_id);
    setBuildAnnounce(b.status === "queued" || b.status === "running");
  }, [history.build]);

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
      // Keep the (now complete) card in the transcript as the durable record of
      // the build; just stop announcing so it can't re-fire on re-render.
      setBuildAnnounce(false);
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
    [invalidatePersonas, openPersonaPanel],
  );

  /** persona_query job failed: personas exist but without run_query evidence. */
  const handleBuildError = useCallback(() => {
    // Keep the failed card visible as the record; stop announcing.
    setBuildAnnounce(false);
    invalidatePersonas();
    toast.error("Personas were built, but analysing their data didn't finish.");
  }, [invalidatePersonas]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !conversationId || ended || needsDataSource) return;
    if (messageMut.isPending) return;

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
          // The snippet above is only a stand-in until the backend's generated
          // name lands; this starts watching for it.
          if (isFirstUserMessage) {
            setAwaitingTitle(conversationId);
            // This turn is what closes the project's data-upload step, so drop
            // the cached answer that still says it is open.
            queryClient.removeQueries({
              queryKey: projectDataStateKey(projectId),
            });
          }
          // building_persona === 1 => requirements done, personas persisted, and
          // the backend kicked off run_query as a background job. Show the loader
          // and poll the job; open the dashboard on completion. When no job_id
          // comes back, open the dashboard immediately.
          if (data.building_persona === 1) {
            markEnded();
            if (data.job_id) {
              setQueryJobId(data.job_id);
              setBuildAnnounce(true);
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
      {/* Toolbar: status, the dataset this build reads, and a shortcut to the
          personas dashboard. Personas also open automatically once the build
          completes. */}
      <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between gap-4 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {buildAnnounce
              ? "Building personas…"
              : ended
                ? "Personas ready"
                : "Persona Builder"}
          </span>
          {/* Which data the personas are evidenced from. Changeable until the
              build is dispatched, then a read-only record of the choice. */}
          {conversationId && history.dataSource && (
            <DataSourceControl
              conversationId={conversationId}
              projectId={projectId}
              value={history.dataSource}
              selected={history.dataSourceSelected}
              locked={history.dataSourceLocked || ended}
              onChanged={history.setDataSource}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
            />
          )}
        </div>
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
              // Seed the card from the persisted snapshot when it's for this same
              // job, so a reopened finished build shows its result immediately
              // (no loader flash). Absent for a build kicked off live this session.
              snapshot={
                history.build?.job_id === queryJobId ? history.build : undefined
              }
              onComplete={buildAnnounce ? handleBuildComplete : undefined}
              onError={buildAnnounce ? handleBuildError : undefined}
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

      {/* Why the composer is locked, and the way out of it. Sits directly above
          the input so the answer is next to the thing it blocks. */}
      {needsDataSource && (
        <div
          role="status"
          className="mx-auto mb-2 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 px-5 text-center text-xs text-muted-foreground"
        >
          <Database className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>Choose which data to build these personas from to get started.</span>
          <Button size="sm" className="h-7 text-xs" onClick={() => setPickerOpen(true)}>
            Choose data source
          </Button>
        </div>
      )}

      <ChatComposer
        rootRef={composerRef}
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        disabled={ended || needsDataSource}
        // needsDataSource is false once `ended`, so these never compete.
        disabledPlaceholder={
          needsDataSource ? "Select a data source to start…" : undefined
        }
        isSending={messageMut.isPending}
        placeholder="Describe your target persona…"
      />
    </div>
  );
}

export default ConversationPromptInput;
