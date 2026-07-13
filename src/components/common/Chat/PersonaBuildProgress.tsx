import { useEffect, useRef } from "react";
import { CheckCircle2, Circle, Loader2, Settings, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  usePersonaBuildJob,
  type PersonaBuildStep,
  type RunQueryPersona,
} from "@/api/Persona/query";

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
 * dashboard.
 *
 * When the job reports `steps`, it renders a live per-step stepper (each step
 * carries a "done / total personas" count); otherwise it falls back to a plain
 * indeterminate loader.
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
  const steps = data?.steps ?? null;
  const hasSteps = Array.isArray(steps) && steps.length > 0;
  const progress = data?.progress ?? 0;

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

      {/* Progress bar: determinate when steps report a percentage, else an
          indeterminate transform-based sweep. Rose + full when failed. */}
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        {failed ? (
          <div className="h-full w-full rounded-full bg-rose-500" />
        ) : hasSteps ? (
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500 ease-out"
            style={{ width: `${Math.min(Math.max(progress, 4), 100)}%` }}
          />
        ) : (
          <div className="absolute top-0 h-full w-2/5 rounded-full bg-foreground/70 animate-[loader-sweep_1.4s_ease-in-out_infinite]" />
        )}
      </div>

      {hasSteps && (
        <ul className="mt-4 space-y-2.5">
          {steps!.map((step) => (
            <StepRow key={step.key} step={step} jobFailed={failed} />
          ))}
        </ul>
      )}

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

/** One row of the build stepper: status icon + label + "x / total" persona count. */
function StepRow({
  step,
  jobFailed,
}: {
  step: PersonaBuildStep;
  jobFailed: boolean;
}) {
  // If the whole job failed, steps still mid-flight read as failed rather than
  // spinning forever.
  const status =
    jobFailed && step.status !== "done" ? "failed" : step.status;
  const isDone = status === "done";
  const isRunning = status === "running";
  const isFailed = status === "failed";

  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : isFailed ? (
          <XCircle className="h-5 w-5 text-rose-500" />
        ) : isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40" />
        )}
      </span>

      <span
        className={cn(
          "flex-1 truncate",
          isDone && "text-foreground",
          isRunning && "font-medium text-foreground",
          isFailed && "text-rose-600",
          status === "pending" && "text-muted-foreground",
        )}
      >
        {step.label}
      </span>

      {/* Per-step persona count, only meaningful with more than one persona. */}
      {step.total > 1 && (
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
          {Math.min(step.done, step.total)}/{step.total}
          {step.failed > 0 && (
            <span className="ml-1 text-rose-500">· {step.failed} failed</span>
          )}
        </span>
      )}
    </li>
  );
}

export default PersonaBuildProgress;
