import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import type { StickToBottomContext } from "use-stick-to-bottom";

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { personaColorStyle } from "@/lib/personaColors";

import LoadingMessage from "../LoadingMessage";
import ErrorMessage from "../ErrorMessage";
import ChatComposer from "../ChatComposer";
import ChatEnded from "../ChatEnded";
import GroupMessage from "./GroupMessage";
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
import { useLoadOlderOnScroll } from "@/hooks/useLoadOlderOnScroll";
import { touchSession } from "@/lib/chatStore";

const ALL = "all";

function GroupChatView() {
  const { groupId } = useParams();

  // History is owned by the pager (grows at the front on scroll-up); messages
  // sent in this session are appended locally at the end.
  const history = useGroupHistory(groupId);
  const [liveMessages, setLiveMessages] = useState<GroupMessageT[]>([]);
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<string>(ALL);
  const [ended, setEnded] = useState(false);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  const participantsQuery = useGroupChatParticipants(groupId);
  const broadcastMut = useGroupBroadcast(groupId ?? "");
  const singleMut = useGroupMessageSingle(groupId ?? "");
  const contextMut = useGroupContext(groupId ?? "");

  const participants = participantsQuery.data ?? [];
  const sending = broadcastMut.isPending || singleMut.isPending;

  const messages = useMemo(
    () => [...history.messages, ...liveMessages],
    [history.messages, liveMessages],
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
  }, [groupId]);

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
            appendLive(
              data.responses.map((r) => ({
                id: crypto.randomUUID(),
                role: "persona",
                persona_name: r.persona_name,
                message: r.response,
                evidence_tags: r.evidence_tags,
              })),
            );
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

  const targetName =
    target === ALL
      ? "Everyone"
      : participants.find((p) => p.persona_id === target)?.persona_name;

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
    <div className="flex h-[calc(100vh-90px)] flex-col overflow-hidden">
      {/* Header: participants + actions */}
      <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {participants.map((p) => {
            const style = personaColorStyle(p.color);
            return (
              <span
                key={p.persona_id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                  style.chip,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", style.avatar)} />
                {p.persona_name}
              </span>
            );
          })}
        </div>
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
              <CircularLoader size="sm" />
            </div>
          )}

          {history.isInitialLoading ? (
            <LoadingMessage />
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
              />
            ))
          )}

          {sending && <LoadingMessage />}
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
            <SelectTrigger size="sm" className="max-w-[180px]">
              <SelectValue placeholder="Everyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Everyone</SelectItem>
              {participants.map((p) => (
                <SelectItem key={p.persona_id} value={p.persona_id}>
                  {p.persona_name}
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
