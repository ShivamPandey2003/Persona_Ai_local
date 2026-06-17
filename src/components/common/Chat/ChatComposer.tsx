import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";
import { ArrowUp } from "lucide-react";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Disables the whole composer (e.g. chat ended). */
  disabled?: boolean;
  /** Shows a spinner on the send button while a reply is in flight. */
  isSending?: boolean;
  placeholder?: string;
  /** Optional control rendered on the left of the action row (e.g. a target selector). */
  leftSlot?: React.ReactNode;
  /** Ref to the composer's root element (used to focus the textarea, e.g. when editing a message). */
  rootRef?: React.Ref<HTMLDivElement>;
};

/**
 * Shared chat input bar used by both the persona-builder and group chats.
 * Submits on Enter (Shift+Enter for newline) via the underlying PromptInput.
 */
function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isSending = false,
  placeholder = "Ask anything",
  leftSlot,
  rootRef,
}: ChatComposerProps) {
  const canSend = Boolean(value.trim()) && !disabled && !isSending;

  const handleSubmit = () => {
    if (!canSend) return;
    onSubmit();
  };

  return (
    <div
      ref={rootRef}
      className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5"
    >
      <PromptInput
        isLoading={isSending}
        value={value}
        onValueChange={onChange}
        onSubmit={handleSubmit}
        disabled={disabled}
        className="border-input bg-popover/85 backdrop-blur-xl relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-[0_8px_30px_-10px_rgba(16,24,40,0.18)]"
      >
        <div className="flex flex-col">
          <PromptInputTextarea
            placeholder={disabled ? "This chat has ended" : placeholder}
            disabled={disabled}
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
          />

          <PromptInputActions className="mt-3 flex w-full items-center justify-between gap-2 p-2">
            {/* Stop the click from reaching PromptInput's focus-the-textarea
                handler, which would otherwise steal focus and close any control
                (e.g. the recipient selector) rendered here. Pointer events are
                left alone so Radix's own open-on-pointerdown still works. */}
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {leftSlot}
            </div>
            <Button
              size="icon"
              disabled={!canSend}
              onClick={handleSubmit}
              className="size-9 rounded-full"
            >
              {isSending ? (
                <CircularLoader size="sm" className="border-white" />
              ) : (
                <ArrowUp size={18} />
              )}
            </Button>
          </PromptInputActions>
        </div>
      </PromptInput>
    </div>
  );
}

export default ChatComposer;
