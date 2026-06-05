import { memo } from "react";
import { Message, MessageContent } from "@/components/ui/message";
import { cn } from "@/lib/utils";
import { personaColorStyle, personaInitials } from "@/lib/personaColors";

type GroupMessageProps = {
  message: GroupMessageT;
  /** Backend colour word for the speaking persona (from participants). */
  color?: string;
};

/** Renders one group-chat turn: a right-aligned user bubble or a labelled persona reply. */
const GroupMessage = memo(({ message, color }: GroupMessageProps) => {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <Message className="mx-auto flex w-full max-w-3xl flex-col items-end gap-1 px-2 md:px-10">
        <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 whitespace-pre-wrap sm:max-w-[75%]">
          {message.message}
        </MessageContent>
      </Message>
    );
  }

  const style = personaColorStyle(color);

  return (
    <Message className="mx-auto flex w-full max-w-3xl flex-row items-start gap-3 px-2 md:px-10">
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
          {message.message}
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
      </div>
    </Message>
  );
});

GroupMessage.displayName = "GroupMessage";

export default GroupMessage;
