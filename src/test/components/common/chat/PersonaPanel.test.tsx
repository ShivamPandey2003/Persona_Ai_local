import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok } from "@/test/msw/handlers";
import { authenticate } from "@/test/factories";
import PersonaPanel from "../../../../components/common/Chat/PersonaPanel";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigateSpy,
}));

// A data-file persona (not a builder persona) so coverage/confidence show.
const makePersona = (over: Record<string, unknown> = {}) => ({
  persona_id: "pa",
  persona_name: "Alpha",
  status: "ready",
  confidence: "High",
  coverage: 85,
  persona_index: null,
  ...over,
});

const summary = {
  personas_created: 2,
  insufficient_data: 0,
  data_files: 1,
  unique_studies: 0,
  unique_respondents: 0,
};

function seedPersonas(personas: unknown[]) {
  server.use(
    http.post(`${API_URL}persona/list`, () => ok({ personas })),
    http.post(`${API_URL}persona/dashboard`, () => ok({ summary, personas: [] })),
  );
}

beforeEach(() => {
  navigateSpy.mockReset();
  authenticate();
});

describe("PersonaPanel", () => {
  it("renders the summary cards and persona list", async () => {
    seedPersonas([makePersona(), makePersona({ persona_id: "pb", persona_name: "Beta" })]);
    renderWithProviders(<PersonaPanel projectId="p1" />);

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Personas Created")).toBeInTheDocument();
    expect(screen.getByText("Data Files")).toBeInTheDocument();
  });

  it("shows an empty state when there are no personas", async () => {
    seedPersonas([]);
    renderWithProviders(<PersonaPanel projectId="p1" />);
    expect(await screen.findByText("No personas yet")).toBeInTheDocument();
  });

  it("starts a single-persona chat from a card", async () => {
    seedPersonas([makePersona()]);
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}persona/group-chat/message`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok({ group_id: "g1", message: "ok" });
      }),
    );
    const { user } = renderWithProviders(<PersonaPanel projectId="p1" />);
    await screen.findByText("Alpha");

    await user.click(screen.getByRole("button", { name: "Chat" }));
    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ flow: "start", persona_ids: ["pa"] });
  });

  it("selects personas and starts a group chat", async () => {
    seedPersonas([
      makePersona(),
      makePersona({ persona_id: "pb", persona_name: "Beta" }),
    ]);
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}persona/group-chat/message`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok({ group_id: "g1", message: "ok" });
      }),
    );
    const { user } = renderWithProviders(<PersonaPanel projectId="p1" />);
    await screen.findByText("Alpha");

    await user.click(screen.getByRole("checkbox", { name: "Select all personas" }));
    await user.click(screen.getByRole("button", { name: /start group chat/i }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ flow: "start", persona_ids: ["pa", "pb"] });
  });

  it("renames a persona inline", async () => {
    seedPersonas([makePersona()]);
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}persona/update`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok({});
      }),
    );
    const { user } = renderWithProviders(<PersonaPanel projectId="p1" />);
    await screen.findByText("Alpha");

    await user.click(screen.getByRole("button", { name: "Rename persona" }));
    const input = screen.getByDisplayValue("Alpha");
    await user.clear(input);
    await user.type(input, "Renamed Persona");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ persona_id: "pa", persona_name: "Renamed Persona" });
  });
});
