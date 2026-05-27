import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import { useState } from "react";
import { MessageComponent } from "./Message";
import LoadingMessage from "./LoadingMessage";
import ErrorMessage from "./ErrorMessage";
import { PromptInput, PromptInputActions, PromptInputTextarea } from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

function ConversationPromptInput() {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) return;

    // sendMessage({ text: input })
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
      <ChatContainerRoot className="relative flex-1 space-y-0 overflow-y-auto">
        <ChatContainerContent className="space-y-12 px-4 py-12">
          {[].map((message, index) => {
            const isLastMessage = index === 1;

            return (
              <MessageComponent
                key={message}
                message={message}
                isLastMessage={isLastMessage}
              />
            );
          })}

          {status === "submitted" && <LoadingMessage />}
          {status === "error" && <ErrorMessage error={{message:"test", name:"test"}} />}
        </ChatContainerContent>
      </ChatContainerRoot>
      <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <PromptInput
          isLoading={status !== "ready"}
          value={input}
          onValueChange={setInput}
          onSubmit={handleSubmit}
          className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
        >
          <div className="flex flex-col">
            <PromptInputTextarea
              placeholder="Ask anything"
              className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
            />

            <PromptInputActions className="mt-3 flex w-full items-center justify-between gap-2 p-2">
              <div />
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  disabled={
                    !input.trim() || (status !== "ready" && status !== "error")
                  }
                  onClick={handleSubmit}
                  className="size-9 rounded-full"
                >
                  {status === "ready" || status === "error" ? (
                    <ArrowUp size={18} />
                  ) : (
                    <span className="size-3 rounded-xs bg-white" />
                  )}
                </Button>
              </div>
            </PromptInputActions>
          </div>
        </PromptInput>
      </div>
    </div>
  );
}

export default ConversationPromptInput;
