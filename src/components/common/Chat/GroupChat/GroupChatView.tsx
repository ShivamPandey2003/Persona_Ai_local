import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { SlidersHorizontal, Users } from "lucide-react";
import type { StickToBottomContext } from "use-stick-to-bottom";

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GradientRingLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { personaColorStyle, personaInitials } from "@/lib/personaColors";

import LoadingMessage from "../LoadingMessage";
import ErrorMessage from "../ErrorMessage";
import ChatComposer from "../ChatComposer";
import ChatEnded from "../ChatEnded";
import ChatHistorySkeleton from "../ChatHistorySkeleton";
import ChatScrollButton from "../ChatScrollButton";
import GroupMessage from "./GroupMessage";
import GroupParticipants from "./GroupParticipants";
import AssumptionsDialog from "./AssumptionsDialog";

import {
  useGroupHistory,
  useGroupChatParticipants,
} from "@/api/GroupChat/query";
import {
  useGroupBroadcast,
  useGroupMessageSingle,
  useGroupContext,
} from "@/api/GroupChat/mutation";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { useLoadOlderOnScroll } from "@/hooks/useLoadOlderOnScroll";
import { touchSession } from "@/lib/chatStore";

const ALL = "all";

function GroupChatView() {
  const { groupId } = useParams();
  const projectId = useActiveProjectId();

  // History is owned by the pager (grows at the front on scroll-up); messages
  // sent in this session are appended locally at the end.
  const history = useGroupHistory(groupId);
  const [liveMessages, setLiveMessages] = useState<GroupMessageT[]>([]);
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<string>(ALL);
  const [ended, setEnded] = useState(false);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  // True while a broadcast's persona replies are being revealed one-by-one.
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const participantsQuery = useGroupChatParticipants(groupId);
  const broadcastMut = useGroupBroadcast(groupId ?? "");
  const singleMut = useGroupMessageSingle(groupId ?? "");
  const contextMut = useGroupContext(groupId ?? "");

  const participants = participantsQuery.data ?? [];
  const sending = broadcastMut.isPending || singleMut.isPending || isRevealing;

  const messages = useMemo(
    () => [...history.messages, ...liveMessages],
    [history.messages, liveMessages],
  );

  // Replies received this session typewriter-reveal; history does not.
  const liveIds = useMemo(
    () => new Set(liveMessages.map((m) => m.id)),
    [liveMessages],
  );

  const colorByName = useMemo(() => {
    const map: Record<string, string> = {};
    participants.forEach((p) => (map[p.persona_name] = p.color));
    return map;
  }, [participants]);

  // Reset when navigating between group chats.
  useEffect(() => {
    setLiveMessages([]);
    setTarget(ALL);
    setEnded(false);
    setAssumptions([]);
    setIsRevealing(false);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  }, [groupId]);

  // Clear any pending reveal timer on unmount.
  useEffect(
    () => () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    },
    [],
  );

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

  const appendLive = (next: GroupMessageT[]) =>
    setLiveMessages((prev) => [...prev, ...next]);

  /**
   * Reveal a broadcast's persona replies one-by-one instead of all at once:
   * each reply is appended (and typewriters in), then the next is scheduled
   * after roughly that reply's typing duration, so it feels like a real
   * back-and-forth rather than a wall of simultaneous answers.
   */
  const revealSequentially = (
    responses: Array<{
      persona_name: string;
      response: string;
      evidence_tags?: string[];
    }>,
  ) => {
    if (responses.length === 0) return;
    setIsRevealing(true);
    let i = 0;
    const step = () => {
      const r = responses[i];
      appendLive([
        {
          id: crypto.randomUUID(),
          role: "persona",
          persona_name: r.persona_name,
          message: r.response,
          evidence_tags: r.evidence_tags,
        },
      ]);
      i += 1;
      if (i < responses.length) {
        const words = (r.response.match(/\S+\s*/g) ?? []).length;
        const delay = Math.min(words * 24 + 500, 4500);
        revealTimerRef.current = setTimeout(step, delay);
      } else {
        setIsRevealing(false);
      }
    };
    step();
  };

  const handleSendError = (err: Error) => {
    if (/ended/i.test(err.message)) setEnded(true);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || !groupId || ended || sending) return;

    setInput("");
    appendLive([{ id: crypto.randomUUID(), role: "user", message: text }]);

    if (target === ALL) {
      broadcastMut.mutate(
        { message: text },
        {
          onSuccess: (data) => {
            revealSequentially(data.responses);
            touchSession(groupId);
          },
          onError: handleSendError,
        },
      );
    } else {
      singleMut.mutate(
        { personaId: target, message: text },
        {
          onSuccess: (data) => {
            appendLive([
              {
                id: crypto.randomUUID(),
                role: "persona",
                persona_name: data.response.persona_name,
                message: data.response.message,
              },
            ]);
            touchSession(groupId);
          },
          onError: handleSendError,
        },
      );
    }
  };

  const handleSaveAssumptions = (next: string[]) => {
    if (!groupId) return;
    contextMut.mutate(
      { assumptions: next },
      {
        onSuccess: () => {
          setAssumptions(next);
          setAssumptionsOpen(false);
          toast.success("Assumptions updated");
        },
      },
    );
  };

  const selectedParticipant = participants.find((p) => p.persona_id === target);
  const targetName =
    target === ALL ? "Everyone" : selectedParticipant?.persona_name;

  if (participantsQuery.isError || history.isError) {
    return (
      <div className="flex h-[calc(100vh-90px)] items-center justify-center">
        <ErrorMessage
          error={{ name: "GroupChatError", message: "Couldn't load this group chat." }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-90px)] flex-col overflow-hidden duration-300 animate-in fade-in">
      {/* Header: participants + actions */}
      <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2">
        <GroupParticipants participants={participants} projectId={projectId} />
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAssumptionsOpen(true)}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Assumptions
            {assumptions.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
                {assumptions.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      <ChatContainerRoot
        contextRef={stbRef}
        className="relative flex-1 space-y-0 overflow-hidden"
      >
        <ChatContainerContent className="space-y-8 py-8">
          {/* Top-of-list spinner while older history loads. */}
          {history.isLoadingOlder && (
            <div className="flex justify-center py-2">
              <GradientRingLoader size="sm" />
            </div>
          )}

          {history.isInitialLoading ? (
            <ChatHistorySkeleton />
          ) : messages.length === 0 ? (
            <p className="mx-auto w-full max-w-3xl px-10 text-center text-sm text-muted-foreground">
              Ask a question to hear from {participants.length || "your"} personas.
            </p>
          ) : (
            messages.map((message) => (
              <GroupMessage
                key={message.id}
                message={message}
                color={
                  message.persona_name
                    ? colorByName[message.persona_name]
                    : undefined
                }
                onEdit={ended ? undefined : handleEditMessage}
                animate={liveIds.has(message.id)}
              />
            ))
          )}

          {sending && <LoadingMessage />}

          <ChatScrollButton />
        </ChatContainerContent>
      </ChatContainerRoot>

      {ended && <ChatEnded message="This discussion has ended." />}

      <ChatComposer
        rootRef={composerRef}
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        disabled={ended}
        isSending={sending}
        placeholder={
          target === ALL
            ? "Message everyone…"
            : `Message ${targetName ?? "persona"}…`
        }
        leftSlot={
          <Select value={target} onValueChange={setTarget} disabled={ended}>
            <SelectTrigger
              size="sm"
              aria-label="Choose who to message"
              className="max-w-[210px] gap-2 pl-1.5"
            >
              {target === ALL ? (
                <span className="flex items-center gap-1.5">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="size-3" />
                  </span>
                  <span className="text-xs font-medium">Everyone</span>
                </span>
              ) : (
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                      personaColorStyle(selectedParticipant?.color).avatar,
                    )}
                  >
                    {personaInitials(selectedParticipant?.persona_name)}
                  </span>
                  <span className="truncate text-xs font-medium">
                    {selectedParticipant?.persona_name}
                  </span>
                </span>
              )}
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="top"
              sideOffset={6}
              className="max-h-72"
            >
              <SelectItem value={ALL}>
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="size-3" />
                  </span>
                  Everyone
                </span>
              </SelectItem>
              <SelectSeparator />
              {participants.map((p) => (
                <SelectItem key={p.persona_id} value={p.persona_id}>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                        personaColorStyle(p.color).avatar,
                      )}
                    >
                      {personaInitials(p.persona_name)}
                    </span>
                    {p.persona_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <AssumptionsDialog
        open={assumptionsOpen}
        onOpenChange={setAssumptionsOpen}
        initial={assumptions}
        onSave={handleSaveAssumptions}
        isSaving={contextMut.isPending}
      />
    </div>
  );
}

export default GroupChatView;
