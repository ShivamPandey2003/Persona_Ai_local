import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import {
  ImagePlus,
  Loader2,
  Mic,
  SlidersHorizontal,
  Square,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
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
import VoiceStatusBar from "../VoiceStatusBar";
import GroupMessage from "./GroupMessage";
import GroupParticipants from "./GroupParticipants";
import AssumptionsDialog from "./AssumptionsDialog";

import {
  useGroupHistory,
  useGroupChatParticipants,
  useGroupAssumptions,
} from "@/api/GroupChat/query";
import { useChatList } from "@/api/Chat/query";
import {
  useGroupBroadcast,
  useGroupMessageSingle,
  uploadGroupImages,
} from "@/api/GroupChat/mutation";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { useLoadOlderOnScroll } from "@/hooks/useLoadOlderOnScroll";
import {
  useImageAttachments,
  IMAGE_ACCEPT,
  MAX_IMAGES,
} from "@/hooks/useImageAttachments";
import { touchSession } from "@/lib/chatStore";
import { useVoiceConfig } from "@/api/Voice/voice";
import { useMicRecorder } from "@/hooks/useMicRecorder";
import { useSpeakerPreference } from "@/hooks/useSpeakerPreference";
import { speechPlayer } from "@/lib/voice/speechPlayer";

const ALL = "all";

// Per-message "read aloud" button hidden for now — flip to true to bring it back.
const PER_MESSAGE_SPEAKER_BUTTON_ENABLED = false;

type PersonaReply = {
  persona_name: string;
  response: string;
  evidence_tags?: string[];
  confidence_level?: string | null;
  confidence_score?: number | null;
};

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
  // Set once this group's first user turn is sent — the turn that makes the
  // backend name the chat. Drives the Recents poll for that name (see below).
  const [awaitingTitle, setAwaitingTitle] = useState<string | null>(null);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  // True while a broadcast's persona replies are being revealed one-by-one.
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image attachments (broadcast-only) staged in the composer.
  const attachments = useImageAttachments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Subscribed purely to rename the Recents entry once the backend has named
  // this chat: the list is shared cache, so the sidebar renders the new name
  // without knowing a poll happened.
  useChatList(projectId, { awaitTitleFor: awaitingTitle ?? undefined });

  const participantsQuery = useGroupChatParticipants(groupId);
  const broadcastMut = useGroupBroadcast(groupId ?? "");
  const singleMut = useGroupMessageSingle(groupId ?? "");
  // Read only: the dialog owns every write. Shared cache key, so applying or
  // removing an assumption in there refreshes this badge with no extra request.
  const assumptionsQuery = useGroupAssumptions(groupId);
  const assumptionCount = assumptionsQuery.data?.assumptions.length ?? 0;

  const participants = participantsQuery.data ?? [];
  const sending =
    broadcastMut.isPending || singleMut.isPending || isRevealing || uploading;

  // Replies can land after the user has moved to another group chat (the view
  // is reused across routes); they must not be shown or spoken there.
  const groupIdRef = useRef(groupId);
  useEffect(() => {
    groupIdRef.current = groupId;
  }, [groupId]);

  // ---- Voice ----
  const voiceConfig = useVoiceConfig().data;
  const sttEnabled = Boolean(voiceConfig?.stt.enabled);
  const ttsEnabled = Boolean(voiceConfig?.tts.enabled);
  // The backend owns the recording limit; the hook has a fallback until it loads.
  const maxRecordingSeconds = voiceConfig?.limits?.max_recording_seconds;
  const [readAloudPref, setReadAloudPref] = useSpeakerPreference();
  const readAloud = ttsEnabled && readAloudPref;
  // Read inside reveal timers, which outlive the render that scheduled them.
  const readAloudRef = useRef(readAloud);
  useEffect(() => {
    readAloudRef.current = readAloud;
  }, [readAloud]);

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

  // Edit: load a previous message's text back into the composer, then focus the
  // textarea (caret at the end) so it can be tweaked and re-sent.
  const composerRef = useRef<HTMLDivElement>(null);
  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      const textarea = composerRef.current?.querySelector("textarea");
      if (textarea) {
        textarea.focus();
        const end = textarea.value.length;
        textarea.setSelectionRange(end, end);
      }
    });
  }, []);

  // Dictation lands in the input for review — it's never sent automatically.
  const mic = useMicRecorder({
    maxDurationMs: maxRecordingSeconds ? maxRecordingSeconds * 1000 : undefined,
    onTranscript: (text) => {
      setInput((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text));
      focusComposer();
    },
  });

  // Reset when navigating between group chats.
  useEffect(() => {
    setLiveMessages([]);
    setTarget(ALL);
    setEnded(false);
    setAwaitingTitle(null);
    setIsRevealing(false);
    setUploading(false);
    attachments.clear();
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    speechPlayer.stop();
    mic.cancel();
    // attachments.clear and mic.cancel are stable; intentionally keyed on groupId only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);


  // Clear any pending reveal timer and stop reading aloud on unmount.
  useEffect(
    () => () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      speechPlayer.stop();
    },
    [],
  );

  // The browser refused to play without a fresh click: turn auto-read off so
  // it doesn't keep failing; the user can switch it back on.
  useEffect(
    () => speechPlayer.onAutoplayBlocked(() => setReadAloudPref(false)),
    [setReadAloudPref],
  );

  const handleToggleReadAloud = () => {
    if (readAloudPref) {
      speechPlayer.stop();
      setReadAloudPref(false);
    } else {
      // Inside the click, so replies arriving later are allowed to play.
      speechPlayer.prime();
      setReadAloudPref(true);
    }
  };

  // While the mic is busy the rest of the bar is locked, so nothing else can
  // change under a dictation that is about to land in the input.
  const micBusy = mic.status !== "idle";

  const handleMicClick = () => {
    if (mic.status === "idle") speechPlayer.stop(); // don't read replies into the mic
    mic.toggle();
  };

  const handleSpeak = useCallback(
    (message: GroupMessageT) =>
      speechPlayer.toggle({
        id: message.id,
        text: message.message,
        speakerKey: message.persona_name,
        groupId: groupIdRef.current,
      }),
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

  const handleEditMessage = useCallback(
    (text: string) => {
      setInput(text);
      focusComposer();
    },
    [focusComposer],
  );

  const appendLive = (next: GroupMessageT[]) =>
    setLiveMessages((prev) => [...prev, ...next]);

  const removeLive = (id: string) =>
    setLiveMessages((prev) => prev.filter((m) => m.id !== id));

  // File picker → validate + stage locally; surface the first rejection reason.
  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const { error } = attachments.addFiles(files);
      if (error) toast.error(error);
    }
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
  };

  /**
   * Reveal a broadcast's persona replies one-by-one instead of all at once:
   * each reply is appended (and typewriters in), then the next is scheduled
   * after roughly that reply's typing duration, so it feels like a real
   * back-and-forth rather than a wall of simultaneous answers.
   */
  // Only reached for replies to the chat still on screen (stale ones are
  // dropped first), so the ref is the group the reply belongs to.
  const speakIfReadingAloud = (message: GroupMessageT) => {
    if (!readAloudRef.current) return;
    speechPlayer.enqueue({
      id: message.id,
      text: message.message,
      speakerKey: message.persona_name,
      groupId: groupIdRef.current,
    });
  };

  const revealSequentially = (responses: PersonaReply[]) => {
    if (responses.length === 0) return;
    const replies: GroupMessageT[] = responses.map((r) => ({
      id: crypto.randomUUID(),
      role: "persona",
      persona_name: r.persona_name,
      message: r.response,
      evidence_tags: r.evidence_tags,
      confidence_level: r.confidence_level,
      confidence_score: r.confidence_score,
    }));
    // Synthesize ahead so each reply can be heard as soon as its bubble appears.
    if (readAloudRef.current) {
      replies.forEach((m) =>
        speechPlayer.prefetch({
          text: m.message,
          speakerKey: m.persona_name,
          groupId: groupIdRef.current,
        }),
      );
    }
    setIsRevealing(true);
    let i = 0;
    const step = () => {
      const reply = replies[i];
      appendLive([reply]);
      // Queued as it's revealed, so audio never runs ahead of the text.
      speakIfReadingAloud(reply);
      const r = responses[i];
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
    if (!text || !groupId || ended || sending || micBusy) return;

    // The backend names the chat from its first exchange, so only that turn is
    // worth watching for a rename.
    const isFirstUserMessage = !messages.some((m) => m.role === "user");

    // A new question interrupts whatever is still being read aloud.
    speechPlayer.stop();
    const sentGroupId = groupId;
    const isCurrentGroup = () => groupIdRef.current === sentGroupId;

    // Take ownership of the staged images so their previews keep rendering in
    // the optimistic bubble.
    const staged = attachments.takeAll();
    const userMsgId = crypto.randomUUID();
    setInput("");
    appendLive([
      {
        id: userMsgId,
        role: "user",
        message: text,
        images: staged.map((s) => ({ url: s.previewUrl, name: s.file.name })),
      },
    ]);

    // Send the turn once any images are uploaded. Broadcast (Everyone) and a
    // single-persona message both accept attachments.
    const sendToServer = (fileIds?: string[]) => {
      if (target === ALL) {
        broadcastMut.mutate(
          { message: text, fileIds },
          {
            onSuccess: (data) => {
              touchSession(sentGroupId);
              if (!isCurrentGroup()) return;
              revealSequentially(data.responses);
              if (isFirstUserMessage) setAwaitingTitle(sentGroupId);
            },
            onError: (err) => {
              if (isCurrentGroup()) handleSendError(err);
            },
          },
        );
      } else {
        singleMut.mutate(
          { personaId: target, message: text, fileIds },
          {
            onSuccess: (data) => {
              touchSession(sentGroupId);
              if (!isCurrentGroup()) return;
              const reply: GroupMessageT = {
                id: crypto.randomUUID(),
                role: "persona",
                persona_name: data.response.persona_name,
                message: data.response.message,
                confidence_level: data.response.confidence_level,
                confidence_score: data.response.confidence_score,
              };
              appendLive([reply]);
              speakIfReadingAloud(reply);
              if (isFirstUserMessage) setAwaitingTitle(sentGroupId);
            },
            onError: (err) => {
              if (isCurrentGroup()) handleSendError(err);
            },
          },
        );
      }
    };

    if (staged.length === 0) {
      sendToServer();
      return;
    }

    // Upload the images first, then send with their file_ids. On failure, roll
    // back the optimistic bubble and restore the text + images to retry.
    setUploading(true);
    uploadGroupImages(
      groupId,
      staged.map((s) => s.file),
    )
      .then((fileIds) => {
        if (isCurrentGroup()) sendToServer(fileIds);
      })
      .catch((err: Error) => {
        if (!isCurrentGroup()) return;
        removeLive(userMsgId);
        setInput(text);
        attachments.restore(staged);
        toast.error(err?.message || "Couldn't upload images, please retry");
      })
      .finally(() => setUploading(false));
  };

  const selectedParticipant = participants.find((p) => p.persona_id === target);
  const targetName =
    target === ALL ? "Everyone" : selectedParticipant?.persona_name;
  const canAttach =
    !ended && !sending && !micBusy && attachments.items.length < MAX_IMAGES;

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
            disabled={micBusy}
            onClick={() => setAssumptionsOpen(true)}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Assumptions
            {assumptionCount > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
                {assumptionCount}
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
                onEdit={ended || micBusy ? undefined : handleEditMessage}
                animate={liveIds.has(message.id)}
                onSpeak={PER_MESSAGE_SPEAKER_BUTTON_ENABLED && ttsEnabled ? handleSpeak : undefined}
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
        inputLocked={micBusy}
        statusBar={
          sttEnabled && micBusy ? (
            <VoiceStatusBar
              status={mic.status}
              stream={mic.stream}
              maxDurationMs={mic.maxDurationMs}
              onDiscard={mic.cancel}
            />
          ) : undefined
        }
        placeholder={
          target === ALL
            ? "Message everyone…"
            : `Message ${targetName ?? "persona"}…`
        }
        attachmentBar={
          attachments.items.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attachments.items.map((it) => (
                <div key={it.id} className="relative">
                  <img
                    src={it.previewUrl}
                    alt={it.file.name}
                    className="h-16 w-16 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => attachments.removeItem(it.id)}
                    aria-label={`Remove ${it.file.name}`}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow ring-2 ring-background"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : undefined
        }
        leftSlot={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              hidden
              onChange={handlePickFiles}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              disabled={!canAttach}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach images"
              title="Attach images"
            >
              <ImagePlus size={18} />
            </Button>
            {sttEnabled && mic.supported && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "relative size-9 shrink-0 rounded-full",
                  mic.status === "recording" &&
                    "bg-destructive/10 text-destructive ring-2 ring-destructive/30 hover:bg-destructive/15 hover:text-destructive",
                )}
                disabled={
                  ended || mic.status === "requesting" || mic.status === "transcribing"
                }
                onClick={handleMicClick}
                aria-label={
                  mic.status === "recording"
                    ? "Stop recording"
                    : mic.status === "transcribing"
                      ? "Transcribing"
                      : "Record voice message"
                }
                aria-pressed={mic.status === "recording"}
                title={mic.status === "recording" ? "Stop recording" : "Record voice message"}
              >
                {mic.status === "transcribing" || mic.status === "requesting" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : mic.status === "recording" ? (
                  <Square size={14} className="animate-pulse fill-current" />
                ) : (
                  <Mic size={18} />
                )}
              </Button>
            )}
            {ttsEnabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-9 shrink-0 rounded-full",
                  readAloudPref && "text-primary",
                )}
                disabled={micBusy}
                onClick={handleToggleReadAloud}
                aria-label={readAloudPref ? "Stop reading replies aloud" : "Read replies aloud"}
                aria-pressed={readAloudPref}
                title={readAloudPref ? "Reading replies aloud" : "Read replies aloud"}
              >
                {readAloudPref ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </Button>
            )}
            <Select value={target} onValueChange={setTarget} disabled={ended || micBusy}>
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
          </>
        }
      />

      <AssumptionsDialog
        open={assumptionsOpen}
        onOpenChange={setAssumptionsOpen}
        groupId={groupId}
      />
    </div>
  );
}

export default GroupChatView;
