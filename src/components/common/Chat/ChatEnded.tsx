import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatEndedProps = {
  /** Copy describing the ended state (e.g. conversation vs. discussion). */
  message?: string;
  className?: string;
};

/**
 * Reusable end-of-conversation indicator.
 *
 * Shown once a builder/group chat is closed and no further messages are
 * accepted. Matches the chat layout's centered, muted footer styling so it
 * sits cleanly above the (disabled) composer.
 */
function ChatEnded({
  message = "This conversation has ended.",
  className,
}: ChatEndedProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mx-auto flex w-full max-w-3xl items-center justify-center gap-1.5 px-5 pb-1 text-center text-xs text-muted-foreground",
        className,
      )}
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      <span>{message}</span>
    </div>
  );
}

export default ChatEnded;
