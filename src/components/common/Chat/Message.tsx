import { Button } from "@/components/ui/button";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

type MessageComponentProps = {
  message: MessageT;
  isLastMessage: boolean;
};

export const MessageComponent = memo(
  ({ message, isLastMessage }: MessageComponentProps) => {
    const [copied, setCopied] = useState(false);
    const isAssistant = message.userType === "Assistant";

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(message.message);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        toast.error("Couldn't copy to clipboard");
      }
    };

    return (
      <Message
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 md:px-10",
          isAssistant ? "items-start" : "items-end",
        )}
      >
        {isAssistant ? (
          <div className="group flex w-full flex-col gap-0">
            <MessageContent
              className="text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0"
              markdown
            >
              {message.message}
            </MessageContent>
            <MessageActions
              className={cn(
                "-ml-2.5 flex",
                isLastMessage && "opacity-100",
              )}
            >
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
            </MessageActions>
          </div>
        ) : (
          <div className="group flex w-full flex-col items-end gap-1">
            <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 whitespace-pre-wrap sm:max-w-[75%]">
              {message.message}
            </MessageContent>
            <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
            </MessageActions>
          </div>
        )}
      </Message>
    );
  },
);

MessageComponent.displayName = "MessageComponent";
