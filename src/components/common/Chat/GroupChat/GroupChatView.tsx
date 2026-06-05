import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { SlidersHorizontal, Square } from "lucide-react";

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
import GroupMessage from "./GroupMessage";
import AssumptionsDialog from "./AssumptionsDialog";

import {
  useGroupChatHistory,
  useGroupChatParticipants,
} from "@/api/GroupChat/query";
import {
  useGroupBroadcast,
  useGroupMessageSingle,
  useGroupContext,
  useEndGroupChat,
} from "@/api/GroupChat/mutation";
import { touchSession } from "@/lib/chatStore";

const ALL = "all";

function GroupChatView() {
  const { groupId } = useParams();

  const [messages, setMessages] = useState<GroupMessageT[]>([]);
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<string>(ALL);
  const [ended, setEnded] = useState(false);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const hydratedRef = useRef(false);

  const participantsQuery = useGroupChatParticipants(groupId);
  const historyQuery = useGroupChatHistory(groupId);
  const broadcastMut = useGroupBroadcast(groupId ?? "");
  const singleMut = useGroupMessageSingle(groupId ?? "");
  const contextMut = useGroupContext(groupId ?? "");
  const endMut = useEndGroupChat(groupId ?? "");

  const participants = participantsQuery.data ?? [];
  const sending = broadcastMut.isPending || singleMut.isPending;

  const colorByName = useMemo(() => {
    const map: Record<string, string> = {};
    participants.forEach((p) => (map[p.persona_name] = p.color));
    return map;
  }, [participants]);

  // Reset when navigating between group chats.
  useEffect(() => {
    hydratedRef.current = false;
    setMessages([]);
    setTarget(ALL);
    setEnded(false);
    setAssumptions([]);
  }, [groupId]);

  // Seed transcript from history once.
  useEffect(() => {
    if (!historyQuery.data || hydratedRef.current) return;
    hydratedRef.current = true;
    setMessages(historyQuery.data);
  }, [historyQuery.data]);

  const appendMessages = (next: GroupMessageT[]) =>
    setMessages((prev) => [...prev, ...next]);

  const handleSendError = (err: Error) => {
    if (/ended/i.test(err.message)) setEnded(true);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || !groupId || ended || sending) return;

    setInput("");
    appendMessages([
      { id: crypto.randomUUID(), role: "user", message: text },
    ]);

    if (target === ALL) {
      broadcastMut.mutate(
        { message: text },
        {
          onSuccess: (data) => {
            appendMessages(
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
            appendMessages([
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

  const handleEnd = () => {
    if (!groupId || ended || endMut.isPending) return;
    endMut.mutate(undefined, {
      onSuccess: () => {
        setEnded(true);
        toast.success("Discussion ended");
      },
    });
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

  if (participantsQuery.isError || historyQuery.isError) {
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
          {!ended && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEnd}
              disabled={endMut.isPending}
              className="text-muted-foreground hover:text-destructive"
            >
              {endMut.isPending ? (
                <CircularLoader size="sm" />
              ) : (
                <Square className="mr-1.5 h-4 w-4" />
              )}
              End
            </Button>
          )}
        </div>
      </div>

      <ChatContainerRoot className="relative flex-1 space-y-0 overflow-hidden">
        <ChatContainerContent className="space-y-8 py-8">
          {historyQuery.isLoading ? (
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
              />
            ))
          )}

          {sending && <LoadingMessage />}
        </ChatContainerContent>
      </ChatContainerRoot>

      {ended && (
        <p className="mx-auto w-full max-w-3xl px-5 pb-1 text-center text-xs text-muted-foreground">
          This discussion has ended.
        </p>
      )}

      <ChatComposer
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
