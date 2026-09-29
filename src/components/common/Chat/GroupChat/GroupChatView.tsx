import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import {
  Download,
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
import { PageHeaderActions, PageHeaderTitle } from "@/components/global/PageHeader";
import { GradientRingLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { CHAT_COLUMN } from "../chatLayout";
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
  useDownloadGroupInsights,
  uploadGroupImages,
} from "@/api/GroupChat/mutation";
import { useGroupChatStream } from "@/api/GroupChat/useGroupChatStream";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { useLoadOlderOnScroll } from "@/hooks/useLoadOlderOnScroll";
import {
  useImageAttachments,
  IMAGE_ACCEPT,
  MAX_IMAGES,
} from "@/hooks/useImageAttachments";
import { useVoiceConfig } from "@/api/Voice/voice";
import { useMicRecorder } from "@/hooks/useMicRecorder";
import { useSpeakerPreference } from "@/hooks/useSpeakerPreference";
import { speechPlayer } from "@/lib/voice/speechPlayer";

const ALL = "all";

// Per-message "read aloud" button hidden for now — flip to true to bring it back.
const PER_MESSAGE_SPEAKER_BUTTON_ENABLED = false;

// Status lines under the replies while personas are still to start answering.
const REPLY_THINKING = [
  "Reading your question…",
  "Thinking it over…",
  "Checking what the data says…",
  "Putting thoughts into words…",
] as const;
// Images go up before the question is sent.
const UPLOAD_THINKING = ["Uploading your images…"] as const;

// Avatars shown in the recipient pill before it collapses the rest into "+N".
const RECIPIENT_AVATAR_LIMIT = 3;

const RECIPIENT_AVATAR =
  "flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-popover";

// Quiet icon buttons on the right of the composer, before send.
const COMPOSER_TOOL =
  "size-9 shrink-0 rounded-lg text-muted-foreground hover:text-foreground";

/**
 * The avatar stack inside the recipient pill when messaging everyone. Phones
 * get just the first avatar so the pill and the composer tools share one row.
 */
function RecipientAvatars({ participants }: { participants: GroupParticipant[] }) {
  if (participants.length === 0) {
    return (
      <span className={cn(RECIPIENT_AVATAR, "bg-primary/10 text-primary")} aria-hidden="true">
        <Users className="size-3.5" />
      </span>
    );
  }
  const shown = participants.slice(0, RECIPIENT_AVATAR_LIMIT);
  const extra = participants.length - shown.length;
  return (
    <span className="flex -space-x-1.5" aria-hidden="true">
      {shown.map((p, i) => (
        <span
          key={p.persona_id}
          className={cn(
            RECIPIENT_AVATAR,
            personaColorStyle(p.color).avatar,
            i > 0 && "max-sm:hidden",
          )}
        >
          {personaInitials(p.persona_name)}
        </span>
      ))}
      {extra > 0 && (
        <span className={cn(RECIPIENT_AVATAR, "bg-muted text-muted-foreground max-sm:hidden")}>
          +{extra}
        </span>
      )}
    </span>
  );
}

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

  // Image attachments (broadcast-only) staged in the composer.
  const attachments = useImageAttachments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Subscribed purely to rename the Recents entry once the backend has named
  // this chat: the list is shared cache, so the sidebar renders the new name
  // without knowing a poll happened.
  const { data: chatList } = useChatList(projectId, {
    awaitTitleFor: awaitingTitle ?? undefined,
  });
  // Shown in the top bar as "project › chat title".
  const chatTitle = chatList?.find((c) => c.kind === "group" && c.id === groupId)?.title;

  const participantsQuery = useGroupChatParticipants(groupId);
  const insightsMut = useDownloadGroupInsights(groupId ?? "");
  // Read only: the dialog owns every write. Shared cache key, so applying or
  // removing an assumption in there refreshes this badge with no extra request.
  const assumptionsQuery = useGroupAssumptions(groupId);
  const assumptionCount = assumptionsQuery.data?.assumptions.length ?? 0;

  const participants = useMemo(() => participantsQuery.data ?? [], [participantsQuery.data]);

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

  // Persona replies stream into `liveMessages` token by token.
  const stream = useGroupChatStream({ setLiveMessages, readAloud });
  const sending = stream.isStreaming || uploading;

  const messages = useMemo(
    () => [...history.messages, ...liveMessages],
    [history.messages, liveMessages],
  );

  const colorByName = useMemo(() => {
    const map: Record<string, string> = {};
    participants.forEach((p) => (map[p.persona_name] = p.color));
    return map;
  }, [participants]);

  // Personas a reply can be addressed to: current participants not marked
  // inactive (a missing flag counts as active). Keyed by id, with a by-name
  // fallback for messages that carry no id — used only when the name is unique.
  const replyTargets = useMemo(() => {
    const byId = new Set<string>();
    const byName = new Map<string, string>();
    const ambiguous = new Set<string>();
    participants.forEach((p) => {
      if (p.active === false) return;
      byId.add(p.persona_id);
      if (byName.has(p.persona_name)) ambiguous.add(p.persona_name);
      else byName.set(p.persona_name, p.persona_id);
    });
    ambiguous.forEach((name) => byName.delete(name));
    return { byId, byName };
  }, [participants]);

  /** The participant a persona message can be replied to, if any. */
  const replyTargetOf = useCallback(
    (message: GroupMessageT): string | undefined => {
      if (message.role !== "persona") return undefined;
      if (message.persona_id) {
        return replyTargets.byId.has(message.persona_id) ? message.persona_id : undefined;
      }
      return message.persona_name ? replyTargets.byName.get(message.persona_name) : undefined;
    },
    [replyTargets],
  );

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
    setUploading(false);
    attachments.clear();
    // The server still finishes and saves a turn whose stream is dropped here.
    stream.cancel();
    speechPlayer.stop();
    mic.cancel();
    // attachments.clear, stream.cancel and mic.cancel are stable; intentionally
    // keyed on groupId only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Stop reading aloud on unmount (the stream hook drops its own turn).
  useEffect(() => () => speechPlayer.stop(), []);

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

  // Reply: address the next message to that persona (the recipient picker
  // shows who it goes to) and put the caret in the composer. The draft is kept.
  const handleReply = useCallback(
    (message: GroupMessageT) => {
      const personaId = replyTargetOf(message);
      if (!personaId) return;
      setTarget(personaId);
      focusComposer();
    },
    [replyTargetOf, focusComposer],
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

  const selectedParticipant = participants.find((p) => p.persona_id === target);
  const targetName =
    target === ALL ? "Everyone" : selectedParticipant?.persona_name;

  const handleSend = () => {
    const text = input.trim();
    if (!text || !groupId || ended || sending || micBusy) return;

    // The backend names the chat from its first exchange, so only that turn is
    // worth watching for a rename.
    const isFirstUserMessage = !messages.some((m) => m.role === "user");

    // A new question interrupts whatever is still being read aloud.
    speechPlayer.stop();
    // Sending is a user gesture: unlock audio now, so replies that arrive
    // later (outside any gesture) may play.
    if (readAloud) speechPlayer.prime();
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
    const sendToServer = (fileIds?: string[]) =>
      stream.send({
        groupId: sentGroupId,
        message: text,
        personaId: target === ALL ? undefined : target,
        fileIds,
        isCurrentGroup,
        onSaved: () => {
          if (isFirstUserMessage) setAwaitingTitle(sentGroupId);
        },
        onFailed: (message) => {
          if (/ended/i.test(message)) setEnded(true);
        },
      });

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
      <PageHeaderTitle
        title={chatTitle}
        status={ended ? { label: "Ended", tone: "neutral" } : undefined}
      />
      <PageHeaderActions>
        <GroupParticipants participants={participants} projectId={projectId} />
        <Button
          variant="outline"
          disabled={micBusy}
          onClick={() => setAssumptionsOpen(true)}
          // The label is hidden on narrow screens; keep the button named.
          aria-label={
            assumptionCount > 0 ? `Assumptions (${assumptionCount} applied)` : "Assumptions"
          }
        >
          <SlidersHorizontal aria-hidden="true" />
          <span className="hidden sm:inline">Assumptions</span>
          {assumptionCount > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
              {assumptionCount}
            </span>
          )}
        </Button>
        <Button
          variant="inverse"
          disabled={insightsMut.isPending || sending || messages.length === 0}
          onClick={() => insightsMut.mutate()}
          aria-label={insightsMut.isPending ? "Preparing insights…" : "Download insights"}
        >
          {insightsMut.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {insightsMut.isPending ? "Preparing insights…" : "Download insights"}
          </span>
        </Button>
      </PageHeaderActions>

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
            <p className={cn(CHAT_COLUMN, "px-10 text-center text-sm text-muted-foreground")}>
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
                // Same locks as the recipient picker, plus a persona that can
                // still be messaged.
                onReply={
                  !ended && !micBusy && replyTargetOf(message) ? handleReply : undefined
                }
                onSpeak={PER_MESSAGE_SPEAKER_BUTTON_ENABLED && ttsEnabled ? handleSpeak : undefined}
              />
            ))
          )}

          {/* While images upload, then until the first persona's reply
              appears. */}
          {(uploading || stream.isWaiting) && (
            <LoadingMessage
              phrases={uploading ? UPLOAD_THINKING : REPLY_THINKING}
              label={uploading ? "Uploading images" : "Personas are replying"}
            />
          )}

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
          <Select value={target} onValueChange={setTarget} disabled={ended || micBusy}>
            <SelectTrigger
              aria-label="Choose who to message"
              className="min-w-0 max-w-[240px] gap-2 rounded-full border-primary/15 bg-primary/5 py-1 pl-1.5 pr-3 text-primary hover:bg-primary/10 data-[size=default]:h-9 dark:bg-primary/10 dark:hover:bg-primary/15 [&>svg]:text-primary/70"
            >
              {target === ALL ? (
                <span className="flex min-w-0 items-center gap-2">
                  <RecipientAvatars participants={participants} />
                  <span className="truncate text-sm font-semibold">Everyone</span>
                </span>
              ) : (
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      RECIPIENT_AVATAR,
                      personaColorStyle(selectedParticipant?.color).avatar,
                    )}
                    aria-hidden="true"
                  >
                    {personaInitials(selectedParticipant?.persona_name)}
                  </span>
                  <span className="truncate text-sm font-semibold">
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
        rightSlot={
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
              className={COMPOSER_TOOL}
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
                  COMPOSER_TOOL,
                  "relative",
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
                  COMPOSER_TOOL,
                  readAloudPref && "text-primary hover:text-primary",
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
