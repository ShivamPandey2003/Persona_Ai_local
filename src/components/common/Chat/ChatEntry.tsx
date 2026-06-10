import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";
import PersonaPanel from "./PersonaPanel";

import { usePersonaList } from "@/api/Persona/query";
import { getAuthToken, postApi } from "@/lib/api";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { findActiveBuilderSession, upsertSession } from "@/lib/chatStore";
import { queryClient } from "@/provider";

type BuilderStartResponse = {
  conversation_id: string;
  first_message: string;
};

function CenteredLoader({ text }: { text: string }) {
  return (
    <div className="flex h-[calc(100vh-90px)] flex-col items-center justify-center gap-3">
      <CircularLoader size="lg" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/**
 * Opens (or resumes) a persona-builder conversation for a project, then
 * redirects to /chat/:conversationId.
 *
 * The start request is issued directly (not via a React Query mutation) and we
 * navigate off the resolved promise. This sidesteps React StrictMode's
 * mount→unmount→remount, which would otherwise deliver a mutation result to a
 * disposed observer and leave the view stuck on the loader. A per-attempt ref
 * guard prevents StrictMode from firing the request twice.
 */
function BuilderEntry({
  projectId,
  forceNew,
}: {
  projectId: string;
  forceNew: boolean;
}) {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const startedAttemptRef = useRef(-1);

  useEffect(() => {
    if (startedAttemptRef.current === attempt) return;
    startedAttemptRef.current = attempt;
    setFailed(false);

    (async () => {
      // Resume an active builder conversation instead of starting a new one.
      if (!forceNew) {
        const existing = findActiveBuilderSession(projectId);
        if (existing) {
          navigate(`/chat/${existing.id}`, { state: { projectId }, replace: true });
          return;
        }
      }

      try {
        // /chat/start was merged into /chat/message, selected by flow="start".
        const data = await postApi<BuilderStartResponse>("persona/chat/message", {
          token: getAuthToken(),
          flow: "start",
          project_id: projectId,
        });
        if (data?.conversation_id) {
          upsertSession({
            id: data.conversation_id,
            kind: "builder",
            projectId,
            title: "New persona chat",
          });
          // Surface the new conversation in the sidebar Recents (chat-list).
          queryClient.invalidateQueries({ queryKey: ["ChatList", projectId] });
          navigate(`/chat/${data.conversation_id}`, {
            state: { projectId },
            replace: true,
          });
        } else {
          setFailed(true);
        }
      } catch {
        // postApi already surfaces a toast; offer a retry.
        setFailed(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (failed) {
    return (
      <div className="flex h-[calc(100vh-90px)] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn't start the persona builder.
        </p>
        <Button variant="outline" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return <CenteredLoader text="Starting persona builder…" />;
}

/**
 * Landing view for /chat. Decides what to show for the active project:
 *  - personas exist  → the persona dashboard (chat with one / group chat)
 *  - no personas yet → resume/start a persona-builder conversation
 * The sidebar "New chat" passes `forceNew` to always begin a new builder chat.
 */
function ChatEntry() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const projectId = useActiveProjectId();
  const forceNew = Boolean((state as { forceNew?: boolean } | null)?.forceNew);

  // Skip the persona lookup entirely when forcing a brand-new chat.
  const personasQuery = usePersonaList(forceNew ? undefined : projectId);

  if (!projectId) {
    return (
      <div className="flex h-[calc(100vh-90px)] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          No project selected. Open a project from the dashboard to start.
        </p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  if (forceNew) {
    return <BuilderEntry key={`${projectId}:new`} projectId={projectId} forceNew />;
  }

  if (personasQuery.isLoading) {
    return <CenteredLoader text="Loading project…" />;
  }

  const personas = personasQuery.data?.personas ?? [];

  if (personas.length === 0) {
    return <BuilderEntry key={projectId} projectId={projectId} forceNew={false} />;
  }

  // Persona dashboard.
  return (
    <div className="mx-auto flex h-[calc(100vh-90px)] w-full max-w-5xl flex-col gap-4 px-4">
      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Personas</h2>
          <p className="text-xs text-muted-foreground">
            Chat with a persona, or select several for a group chat.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/chat", { state: { projectId, forceNew: true } })}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New persona chat
        </Button>
      </div>
      <PersonaPanel projectId={projectId} scrollHeight="flex-1 min-h-0" />
    </div>
  );
}

export default ChatEntry;
