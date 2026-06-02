import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import { useEffect, useRef, useState } from "react";
import { MessageComponent } from "./Message";
import LoadingMessage from "./LoadingMessage";
import ErrorMessage from "./ErrorMessage";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { SCRIPT, type ScriptLine } from "@/data/DummyChat";
import type { AppDispatch, RootState } from "@/redux/store";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useParams } from "react-router";
import { setPersonaDialog, setProjects } from "@/redux/ProjectSlice";
import { PERSONA_DETAILS } from "@/data/DummyPersona";
import { GetHtmlTitle } from "@/lib/utils";

function ConversationPromptInput() {
  const { projects } = useSelector((state: RootState) => state.Project);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamIntervalRef = useRef<number | null>(null);
  const isStreamingRef = useRef(false);
  const hasStreamedRef = useRef<boolean>(false);
  const [messages, setMessages] = useState<(ScriptLine & { id: number })[]>([]);
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { id } = useParams();

  const state = location.state as { projectId: string };

  const streamResponse = () => {
    if (isStreamingRef.current) return;

    const assistantCount = messages.filter(
      (m) => m.role === "assistant",
    ).length;

    const response = SCRIPT[assistantCount];

    if (!response) return;

    const fullResponse = response.content;
    const isHtml = response.type === "HTML";

    const messageId = Date.now();

    dispatch(
      setProjects(
        projects.map((item) => {
          if (item.id === state.projectId) {
            return {
              ...item,
            };
          }

          return item;
        }),
      ),
    );

    // Create assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "assistant",
        content: "",
        type: response.type,
      },
    ]);

    // HTML messages should render immediately
    if (isHtml) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: fullResponse,
              }
            : msg,
        ),
      );

      if (response.createdAt) {
        dispatch(
          setProjects(
            projects.map((item) => {
              if (item.id === state.projectId) {
                return {
                  ...item,
                  personas: PERSONA_DETAILS,
                };
              }

              return item;
            }),
          ),
        );

        dispatch(setPersonaDialog(true));
      }

      return;
    }

    // Markdown/Text messages stream normally
    isStreamingRef.current = true;
    setIsStreaming(true);

    let charIndex = 0;

    streamIntervalRef.current = window.setInterval(() => {
      if (charIndex < fullResponse.length) {
        const currentContent = fullResponse.slice(0, charIndex + 1);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: currentContent,
                }
              : msg,
          ),
        );

        charIndex++;
      } else {
        clearInterval(streamIntervalRef.current!);

        isStreamingRef.current = false;
        setIsStreaming(false);

        if (response.createdAt) {
          dispatch(
            setProjects(
              projects.map((item) => {
                if (item.id === state.projectId) {
                  return {
                    ...item,
                    personas: PERSONA_DETAILS,
                  };
                }

                return item;
              }),
            ),
          );

          dispatch(setPersonaDialog(true));
        }
      }
    }, 30);
  };

  useEffect(() => {
    if (hasStreamedRef.current) return;

    const project = projects.find((pre) => pre.id === state?.projectId);

    if (project && project.personas.length === 0) {
      hasStreamedRef.current = true;
      streamResponse();
    }
  }, [state?.projectId, projects]);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    if (isStreamingRef.current) return;

    if (messages.length === 1) {
      const message = messages[0];
      dispatch(
        setProjects(
          projects.map((item) => {
            if (item.id === state.projectId) {
              return {
                ...item,
                chats: [
                  {
                    id: id,
                    title:
                      message.type === "HTML"
                        ? GetHtmlTitle(message.content).split(" ").slice(0, 4).join(" ")
                        : message.content.split(" ").slice(0, 4).join(" "),
                    description: message.content
                      .split(" ")
                      .slice(0, 12)
                      .join(" "),
                    Messages: [],
                  },
                  ...item.chats,
                ],
              };
            }

            return item;
          }),
        ),
      );
    }
  }, [messages, isStreamingRef.current]);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;

    const newMessageId = messages.length;
    setMessages((pre) => [
      ...pre,
      {
        id: newMessageId,
        role: "user",
        content: input,
      },
    ]);

    streamResponse();
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-90px)] flex-col overflow-hidden">
      <ChatContainerRoot className="relative flex-1 space-y-0 overflow-y-auto">
        <ChatContainerContent className="space-y-12 px-4 py-12">
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const isFirstMessage = index === 0;

            return (
              <MessageComponent
                handleSubmit={(p: string) => {
                  setMessages((pre) => [
                    ...pre,
                    {
                      id: 1222,
                      role: "user",
                      content: p,
                    },
                  ]);
                  streamResponse();
                }}
                key={message.id}
                message={message}
                isLastMessage={isLastMessage}
                isFirstMessage={isFirstMessage}
              />
            );
          })}

          {status === "submitted" && <LoadingMessage />}
          {status === "error" && (
            <ErrorMessage error={{ message: "test", name: "test" }} />
          )}
        </ChatContainerContent>
      </ChatContainerRoot>
      <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5">
        <PromptInput
          isLoading={isStreaming}
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
                    !input.trim() || isStreaming
                    // || (status !== "ready" && status !== "error")
                  }
                  onClick={handleSubmit}
                  className="size-9 rounded-full"
                >
                  {true ? (
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
