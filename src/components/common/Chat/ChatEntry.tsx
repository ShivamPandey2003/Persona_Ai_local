import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GradientRingLoader, TextShimmerLoader } from "@/components/ui/loader";
import PersonaPanel from "./PersonaPanel";

import { usePersonaList } from "@/api/Persona/query";
import type { BuilderChatTurnResponse } from "@/api/Chat/mutation";
import { getAuthToken, postApi } from "@/lib/api";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { findActiveBuilderSession, upsertSession } from "@/lib/chatStore";
import { queryClient } from "@/provider";

function CenteredLoader({ text }: { text: string }) {
  return (
    <div className="flex h-[calc(100vh-90px)] flex-col items-center justify-center gap-4 duration-300 animate-in fade-in">
      <GradientRingLoader size="lg" />
      <TextShimmerLoader text={text} />
    </div>
  );
}

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
      if (!forceNew) {
        const existing = findActiveBuilderSession(projectId);
        if (existing) {
          navigate(`/chat/${existing.id}`, { state: { projectId }, replace: true });
          return;
        }
      }

      try {
        const data = await postApi<BuilderChatTurnResponse>("persona/chat/message", {
          token: getAuthToken(),
          flow: "start",
          project_id: projectId,
        });
        if (data?.id) {
          upsertSession({
            id: data.id,
            kind: "builder",
            projectId,
            title: "New persona chat",
          });
          queryClient.invalidateQueries({ queryKey: ["ChatList", projectId] });
          navigate(`/chat/${data.id}`, {
            state: { projectId },
            replace: true,
          });
        } else {
          setFailed(true);
        }
      } catch {
        setFailed(true);
      }
    })();
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

function ChatEntry() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const projectId = useActiveProjectId();
  const forceNew = Boolean((state as { forceNew?: boolean } | null)?.forceNew);

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

  return (
    <div className="mx-auto flex h-[calc(100vh-90px)] w-full max-w-5xl flex-col gap-4 px-4 duration-300 animate-in fade-in">
      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-gradient-brand w-fit text-lg font-semibold">
            Personas
          </h2>
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
