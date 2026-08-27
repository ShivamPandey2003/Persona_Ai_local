import { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import { ArrowRight, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DataFileDropzone from "@/components/common/Upload/DataFileDropzone";
import DataPipelineProgress from "@/components/common/Upload/DataPipelineProgress";
// import RequiredFormatCard from "@/components/common/Upload/RequiredFormatCard";
import { useDataFileSelection } from "@/hooks/useDataFileSelection";
import { uploadDataFiles, useProcessDataFiles } from "@/api/Projects/dataFiles";

type Phase = "idle" | "submitting" | "processing";

/**
 * Post-project-creation step: the user uploads their survey data files
 * (.xlsx/.sav), the API stores them in S3 (proxy upload) and dispatches the
 * background pipeline, and we poll it to completion before handing off to the
 * persona builder chat. `projectId` comes from the route param so the page
 * survives a refresh.
 */
function UploadPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const { items, addFiles, removeItem, clear } = useDataFileSelection();
  const processMutation = useProcessDataFiles();

  const [phase, setPhase] = useState<Phase>("idle");
  const [jobId, setJobId] = useState<string | null>(null);

  // Route param is the source of truth; guard against a direct hit with no id.
  if (!projectId) {
    return <Navigate to="/dashboard" replace />;
  }

  const goToBuilder = () =>
    navigate("/chat", { state: { projectId }, replace: true });

  const handleUpload = async () => {
    if (items.length === 0 || phase !== "idle") return;
    setPhase("submitting");
    try {
      const uploaded = await uploadDataFiles(
        projectId,
        items.map((i) => i.file),
      );
      const res = await processMutation.mutateAsync({
        projectId,
        fileIds: uploaded.map((u) => u.file_id),
      });
      clear();
      setJobId(res.job_id);
      setPhase("processing");
    } catch {
      // uploadDataFiles / postApi already surfaced a toast; return to idle so
      // the user can adjust and retry.
      setPhase("idle");
    }
  };

  const handlePipelineComplete = () => {
    toast.success("Your data is ready");
    goToBuilder();
  };

  const handlePipelineError = () => {
    toast.error("Data processing failed. Please try uploading again.");
    setJobId(null);
    setPhase("idle");
  };

  const busy = phase !== "idle";
  const cameFromCreate = Boolean(
    (state as { fromCreate?: boolean } | null)?.fromCreate,
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 duration-300 animate-in fade-in">
      <div className="mb-6">
        <h1 className="text-gradient-brand w-fit text-xl font-semibold">
          Upload your data
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cameFromCreate ? "Project created. " : ""}
          Add the survey files your personas will be built from. We'll process
          them, then take you to the persona builder.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        {/* Left: upload / progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data files</CardTitle>
            <CardDescription>
              Upload one or more .xlsx or .sav files.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
              <a
                href="/instructions.pdf"
                download
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Download instructions
              </a>
              <a
                href="/sample_data.xlsx"
                download
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Download sample Excel file
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {phase === "processing" && jobId ? (
              <DataPipelineProgress
                jobId={jobId}
                onComplete={handlePipelineComplete}
                onError={handlePipelineError}
              />
            ) : (
              <>
                <DataFileDropzone
                  items={items}
                  onAddFiles={addFiles}
                  onRemove={removeItem}
                  disabled={busy}
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToBuilder}
                    disabled={busy}
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={items.length === 0 || busy}
                  >
                    {phase === "submitting" ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        Upload &amp; Continue
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: required format example */}
        {/* <RequiredFormatCard /> */}
      </div>
    </div>
  );
}

export default UploadPage;
