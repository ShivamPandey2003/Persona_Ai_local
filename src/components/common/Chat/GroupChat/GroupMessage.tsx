import { memo, useState } from "react";
import { Check, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message";
import { cn } from "@/lib/utils";
import { useTypewriter } from "@/hooks/useTypewriter";
import { personaColorStyle, personaInitials } from "@/lib/personaColors";

type GroupMessageProps = {
  message: GroupMessageT;
  /** Backend colour word for the speaking persona (from participants). */
  color?: string;
  /**
   * When provided (user messages only), shows an Edit action that loads the
   * message text back into the composer so it can be edited and re-sent.
   */
  onEdit?: (text: string) => void;
  /** Typewriter-reveal this message (a freshly received persona reply). */
  animate?: boolean;
};

/** Renders one group-chat turn: a right-aligned user bubble or a labelled persona reply. */
const GroupMessage = memo(({ message, color, onEdit, animate }: GroupMessageProps) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const shown = useTypewriter(message.message, Boolean(animate) && !isUser);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const copyAction = (
    <MessageAction tooltip={copied ? "Copied" : "Copy"} delayDuration={100}>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={handleCopy}
      >
        {copied ? <Check className="text-emerald-600" /> : <Copy />}
      </Button>
    </MessageAction>
  );

  if (isUser) {
    return (
      <Message className="group mx-auto flex w-full max-w-3xl flex-col items-end gap-1 px-2 duration-300 animate-in fade-in slide-in-from-right-2 md:px-10">
        <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 whitespace-pre-wrap sm:max-w-[75%]">
          {message.message}
        </MessageContent>
        <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {onEdit && (
            <MessageAction tooltip="Edit" delayDuration={100}>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => onEdit(message.message)}
              >
                <Pencil />
              </Button>
            </MessageAction>
          )}
          {copyAction}
        </MessageActions>
      </Message>
    );
  }

  const style = personaColorStyle(color);

  return (
    <Message className="group mx-auto flex w-full max-w-3xl flex-row items-start gap-3 px-2 duration-300 animate-in fade-in slide-in-from-left-2 md:px-10">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          style.avatar,
        )}
      >
        {personaInitials(message.persona_name ?? "?")}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn("text-xs font-semibold", style.text)}>
          {message.persona_name}
        </span>
        <MessageContent
          markdown
          className="text-foreground prose w-full min-w-0 rounded-lg bg-transparent p-0"
        >
          {shown}
        </MessageContent>
        {message.evidence_tags && message.evidence_tags.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {message.evidence_tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1",
                  style.chip,
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <MessageActions className="-ml-2.5 flex opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {copyAction}
        </MessageActions>
      </div>
    </Message>
  );
});

GroupMessage.displayName = "GroupMessage";

export default GroupMessage;
