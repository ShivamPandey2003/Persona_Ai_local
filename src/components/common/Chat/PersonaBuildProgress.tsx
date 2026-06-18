import { useEffect, useRef } from "react";
import { Loader2, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePersonaBuildJob, type RunQueryPersona } from "@/api/Persona/query";

type PersonaBuildProgressProps = {
  jobId: string;
  /** Fired once when the job finishes successfully, with its run_query output. */
  onComplete: (personas: RunQueryPersona[]) => void;
  /** Fired once when the job fails. */
  onError?: () => void;
  /** Open the persona dashboard regardless of job state. */
  onViewPersonas?: () => void;
};

/**
 * Loader shown while the persona_query (run_query) background job runs. Polls
 * /projects/job-status (via {@link usePersonaBuildJob}) and calls onComplete /
 * onError exactly once when the job settles, so the parent can open the
 * dashboard. A plain loader for now — no step-by-step progress bar yet.
 */
function PersonaBuildProgress({
  jobId,
  onComplete,
  onError,
  onViewPersonas,
}: PersonaBuildProgressProps) {
  const { data, isError } = usePersonaBuildJob(jobId);

  const status = data?.status ?? "running";
  const failed = status === "failed" || isError;

  // Fire onComplete / onError exactly once when the job settles.
  const settledRef = useRef(false);
  useEffect(() => {
    if (settledRef.current) return;
    if (status === "done") {
      settledRef.current = true;
      onComplete(data?.result?.personas ?? []);
    } else if (failed) {
      settledRef.current = true;
      onError?.();
    }
  }, [status, failed, data?.result?.personas, onComplete, onError]);

  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border bg-card p-5 shadow-sm duration-300 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
          <Settings className={cn("h-5 w-5", !failed && "animate-spin")} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {failed ? "Couldn't build your personas" : "Building Your Personas…"}
          </p>
          <p className="text-xs text-muted-foreground">
            {failed
              ? "Something went wrong while analysing the data."
              : "Analysing your survey data — this can take a moment."}
          </p>
        </div>
        {!failed && (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Indeterminate loader bar — smooth transform-based sweep, left -> right. */}
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        {failed ? (
          <div className="h-full w-full rounded-full bg-rose-500" />
        ) : (
          <div className="absolute top-0 h-full w-2/5 rounded-full bg-foreground/70 animate-[loader-sweep_1.4s_ease-in-out_infinite]" />
        )}
      </div>

      {failed && onViewPersonas && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onViewPersonas}>
            View personas anyway
          </Button>
        </div>
      )}
    </div>
  );
}

export default PersonaBuildProgress;
