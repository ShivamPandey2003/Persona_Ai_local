import { Button } from "@/components/ui/button";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { memo, useState } from "react";
import { FileUploader } from "./fileUploader";

type MessageComponentProps = {
  message: any;
  isLastMessage: boolean;
  isFirstMessage: boolean;
  isStreaming?: boolean;
  handleSubmit: (p:string)=>void
};

export const MessageComponent = memo(
  ({
    message,
    isLastMessage,
    isStreaming,
    isFirstMessage,
    handleSubmit
  }: MessageComponentProps) => {
    const [files, setFiles] = useState<File[]>([]);
    const isAssistant = message.role === "assistant";

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
              html={message.type === "HTML"}
              markdown={message.type === "TEXT"}
            >
              {message.content}
            </MessageContent>
            <MessageActions
              className={cn(
                "-ml-2.5 flex",
                isStreaming && "hidden",
                isLastMessage && "opacity-100",
              )}
            >
              <MessageAction tooltip="Copy" delayDuration={100}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Copy />
                </Button>
              </MessageAction>
            </MessageActions>
            {isFirstMessage && (
              <FileUploader files={files} setFiles={setFiles} onSubmit={handleSubmit} />
              
            )}
          </div>
        ) : (
          <div className="group flex w-full flex-col items-end gap-1">
            <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 whitespace-pre-wrap sm:max-w-[75%]">
              {message.content}
            </MessageContent>
            <MessageActions
              className={cn(
                "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
              )}
            >
              <MessageAction tooltip="Copy" delayDuration={100}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Copy />
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
