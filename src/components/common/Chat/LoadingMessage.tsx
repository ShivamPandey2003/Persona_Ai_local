import { TypingLoader } from "@/components/ui/loader"
import { Message } from "@/components/ui/message"
import { memo } from "react"

/** Assistant "typing…" indicator: bouncing dots inside a chat bubble. */
const LoadingMessage = memo(() => (
  <Message className="mx-auto flex w-full max-w-3xl flex-col items-start gap-2 px-0 duration-300 animate-in fade-in slide-in-from-left-2 md:px-10">
    <div className="flex w-fit items-center rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
      <TypingLoader size="md" />
    </div>
  </Message>
))

LoadingMessage.displayName = "LoadingMessage"

export default LoadingMessage
