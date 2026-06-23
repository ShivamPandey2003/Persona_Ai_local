import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok } from "@/test/msw/handlers";
import { authenticate } from "@/test/factories";
import PersonaBuildProgress from "../../../../components/common/Chat/PersonaBuildProgress";

beforeEach(() => authenticate());

const jobStatus = (over: Record<string, unknown>) =>
  server.use(
    http.post(`${API_URL}projects/job-status`, () =>
      ok({ job_id: "j1", status: "running", progress: 0, result: null, ...over }),
    ),
  );

describe("PersonaBuildProgress", () => {
  it("shows the building state while the job runs", async () => {
    jobStatus({ status: "running" });
    renderWithProviders(
      <PersonaBuildProgress jobId="j1" onComplete={vi.fn()} />,
    );
    expect(await screen.findByText(/building your personas/i)).toBeInTheDocument();
  });

  it("calls onComplete once when the job is done", async () => {
    jobStatus({ status: "done", progress: 100, result: { personas: [] } });
    const onComplete = vi.fn();
    renderWithProviders(
      <PersonaBuildProgress jobId="j1" onComplete={onComplete} />,
    );
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("shows the failed state and calls onError", async () => {
    jobStatus({ status: "failed" });
    const onError = vi.fn();
    renderWithProviders(
      <PersonaBuildProgress jobId="j1" onComplete={vi.fn()} onError={onError} />,
    );
    expect(await screen.findByText(/couldn't build your personas/i)).toBeInTheDocument();
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("offers a View personas anyway action on failure", async () => {
    jobStatus({ status: "failed" });
    const onViewPersonas = vi.fn();
    const { user } = renderWithProviders(
      <PersonaBuildProgress
        jobId="j1"
        onComplete={vi.fn()}
        onError={vi.fn()}
        onViewPersonas={onViewPersonas}
      />,
    );
    await user.click(await screen.findByRole("button", { name: /view personas anyway/i }));
    expect(onViewPersonas).toHaveBeenCalled();
  });
});
