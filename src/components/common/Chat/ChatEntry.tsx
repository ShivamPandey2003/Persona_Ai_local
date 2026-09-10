import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GradientRingLoader, TextShimmerLoader } from "@/components/ui/loader";
import PersonaPanel from "./PersonaPanel";

import { usePersonaList } from "@/api/Persona/query";
import { useProjectDataState } from "@/api/Projects/dataFiles";
import { useBuilderChatStart } from "@/api/Chat/mutation";
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
  const startMut = useBuilderChatStart();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const startedAttemptRef = useRef(-1);

  useEffect(() => {
    if (startedAttemptRef.current === attempt) return;
    startedAttemptRef.current = attempt;

    if (!forceNew) {
      const existing = findActiveBuilderSession(projectId);
      if (existing) {
        navigate(`/chat/${existing.id}`, { state: { projectId }, replace: true });
        return;
      }
    }

    // The chat opens immediately — no data-source step in front of it. The
    // dataset defaults to master server-side and is changed from the chip in the
    // chat toolbar, which stays editable right up until the build is dispatched.
    // Asking here would block every new chat with a decision most users never
    // need to make, to save a click for the few who do.
    startMut.mutate(
      { projectId },
      {
        onSuccess: (data) => {
          if (!data?.id) {
            setFailed(true);
            return;
          }
          upsertSession({
            id: data.id,
            kind: "builder",
            projectId,
            title: "New persona chat",
          });
          queryClient.invalidateQueries({ queryKey: ["ChatList", projectId] });
          navigate(`/chat/${data.id}`, { state: { projectId }, replace: true });
        },
        onError: () => setFailed(true),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (failed) {
    return (
      <div className="flex h-[calc(100vh-90px)] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn't start the persona builder.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setFailed(false);
            setAttempt((a) => a + 1);
          }}
        >
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
  const routeState = state as
    | { forceNew?: boolean; fromUpload?: boolean }
    | null;
  const forceNew = Boolean(routeState?.forceNew);
  // Both are explicit "I want to chat now" intents — the upload page handing off
  // (skipped, or the pipeline finished), and the New persona chat button.
  // Without this the handoff would bounce straight back into the step it just
  // left. The flag lives in route state, not storage, so it lasts exactly one
  // navigation: returning to the project later re-reads the state, which is the
  // whole point of the step staying open until the project has real activity.
  const wantsChat = forceNew || Boolean(routeState?.fromUpload);

  const dataState = useProjectDataState(wantsChat ? undefined : projectId);
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

  // Resolve the setup state BEFORE anything else: BuilderEntry creates a
  // conversation the moment it mounts, and a conversation created behind a
  // redirect to the upload step is one the user never asked for.
  if (!wantsChat) {
    if (dataState.isPending) {
      return <CenteredLoader text="Loading project…" />;
    }
    if (dataState.data?.upload_allowed) {
      return <Navigate to={`/upload/${projectId}`} replace />;
    }
    // A failed state lookup falls through to the chat rather than stranding the
    // user: the upload step is optional, the chat is the project.
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
