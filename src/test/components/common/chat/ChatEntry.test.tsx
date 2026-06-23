import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok, envelopeError } from "@/test/msw/handlers";
import { authenticate } from "@/test/factories";
import ChatEntry from "../../../../components/common/Chat/ChatEntry";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigateSpy,
}));

const atProject = (state: Record<string, unknown> = { projectId: "p1" }) =>
  ({ routerEntries: [{ pathname: "/chat", state }] } as never);

beforeEach(() => {
  navigateSpy.mockReset();
  authenticate();
});

describe("ChatEntry", () => {
  it("prompts to pick a project when there is no project context", () => {
    renderWithProviders(<ChatEntry />);
    expect(screen.getByText(/no project selected/i)).toBeInTheDocument();
  });

  it("shows the persona dashboard when the project has personas", async () => {
    server.use(
      http.post(`${API_URL}persona/list`, () =>
        ok({ personas: [{ persona_id: "pa", persona_name: "Alpha", status: "ready", confidence: "High", coverage: 80, persona_index: null }] }),
      ),
      http.post(`${API_URL}persona/dashboard`, () =>
        ok({ summary: { personas_created: 1, insufficient_data: 0, data_files: 0 }, personas: [] }),
      ),
    );
    renderWithProviders(<ChatEntry />, atProject());

    expect(await screen.findByText("Personas")).toBeInTheDocument();
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
  });

  it("starts a new builder conversation when the project has no personas", async () => {
    server.use(
      http.post(`${API_URL}persona/list`, () => ok({ personas: [] })),
      http.post(`${API_URL}persona/chat/message`, () =>
        ok({ id: "conv-new", messages: [], building_persona: 0 }),
      ),
    );
    renderWithProviders(<ChatEntry />, atProject());

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith(
        "/chat/conv-new",
        expect.objectContaining({ state: { projectId: "p1" }, replace: true }),
      ),
    );
  });

  it("surfaces a retry affordance when starting the builder fails", async () => {
    server.use(
      http.post(`${API_URL}persona/chat/message`, () => envelopeError(500, "error")),
    );
    // forceNew skips the persona list and goes straight to BuilderEntry.
    renderWithProviders(<ChatEntry />, atProject({ projectId: "p1", forceNew: true }));

    expect(await screen.findByText(/couldn't start the persona builder/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
