import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
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

function seedPersonas(personas: unknown[], dashboardPersonas: unknown[] = []) {
  server.use(
    http.post(`${API_URL}persona/list`, () => ok({ personas })),
    http.post(`${API_URL}persona/dashboard`, () => ok({ summary, personas: dashboardPersonas })),
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

  it("labels each persona with its data source and filters by it", async () => {
    // Radix Select opens on pointer events jsdom does not implement.
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
    seedPersonas([
      makePersona({ data_source: "master" }),
      makePersona({ persona_id: "pb", persona_name: "Beta", data_source: "uploaded" }),
      makePersona({ persona_id: "pc", persona_name: "Gamma", data_source: "combined" }),
    ]);
    const { user } = renderWithProviders(<PersonaPanel projectId="p1" />);

    await screen.findByText("Alpha");
    expect(screen.getByLabelText("Built from Master data")).toBeInTheDocument();
    expect(screen.getByLabelText("Built from My uploaded data")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Built from Master + my uploaded data"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("combobox", { name: "Filter personas by data source" }),
    );
    await user.click(await screen.findByRole("option", { name: /My uploaded data/ }));

    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
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

  it("blocks selecting or chatting with an insufficient-data persona", async () => {
    seedPersonas(
      [makePersona(), makePersona({ persona_id: "pb", persona_name: "Beta" })],
      [
        {
          persona_id: "pa",
          persona_name: "Alpha",
          insufficient_data: true,
          study_summary: [],
          evidence_by_category: [],
          unique_studies: 0,
          unique_respondents: 2,
        },
        {
          persona_id: "pb",
          persona_name: "Beta",
          insufficient_data: false,
          study_summary: [],
          evidence_by_category: [],
          unique_studies: 1,
          unique_respondents: 50,
        },
      ],
    );
    let groupChatCalled = false;
    server.use(
      http.post(`${API_URL}persona/group-chat/message`, () => {
        groupChatCalled = true;
        return ok({ group_id: "g1", message: "ok" });
      }),
    );
    const { user } = renderWithProviders(<PersonaPanel projectId="p1" />);
    await screen.findByText("Alpha");

    // "ready" is misleading on a persona that isn't usable yet — hidden for it,
    // still shown for one with enough data.
    expect(screen.queryByText("ready")).toBeInTheDocument();
    const alphaRow = screen.getByText("Alpha").closest(".rounded-xl") as HTMLElement;
    expect(within(alphaRow).queryByText("ready")).not.toBeInTheDocument();

    const alphaCheckbox = screen.getByRole("checkbox", { name: "Select Alpha" });
    const betaCheckbox = screen.getByRole("checkbox", { name: "Select Beta" });
    expect(alphaCheckbox).toBeDisabled();
    expect(betaCheckbox).not.toBeDisabled();

    const chatButtons = screen.getAllByRole("button", { name: "Chat" });
    expect(chatButtons[0]).toBeDisabled(); // Alpha's
    expect(chatButtons[1]).not.toBeDisabled(); // Beta's
    await user.click(chatButtons[0]);
    expect(groupChatCalled).toBe(false);

    // "Select all" only picks up the persona with enough data.
    await user.click(screen.getByRole("checkbox", { name: "Select all personas" }));
    expect(alphaCheckbox).not.toBeChecked();
    expect(betaCheckbox).toBeChecked();
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

  it("narrows the list to insufficient-data personas from its tile", async () => {
    seedPersonas(
      [makePersona(), makePersona({ persona_id: "pb", persona_name: "Beta" })],
      [
        { persona_id: "pa", persona_name: "Alpha", insufficient_data: true, study_summary: [], evidence_by_category: [], unique_studies: 0, unique_respondents: 2 },
        { persona_id: "pb", persona_name: "Beta", insufficient_data: false, study_summary: [], evidence_by_category: [], unique_studies: 1, unique_respondents: 50 },
      ],
    );
    const { user } = renderWithProviders(<PersonaPanel projectId="p1" />);
    await screen.findByText("Beta");

    await user.click(screen.getByRole("button", { name: /Insufficient Data/ }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    // Nothing here can be chatted with, so the group-chat footer is gone.
    expect(screen.queryByRole("button", { name: /start group chat/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Personas Created/ }));
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("lists the project's data files and downloads one", async () => {
    seedPersonas([makePersona()]);
    let downloadBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}projects/files/list`, () =>
        ok({
          files: [
            { file_id: "f1", file_name: "wave1.xlsx", status: "processed", rows: 120, created_at: "2026-09-01T10:00:00" },
          ],
        }),
      ),
      http.post(`${API_URL}projects/files/data/download`, async ({ request }) => {
        downloadBody = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(new Blob(["bytes"]), {
          headers: { "Content-Type": "application/octet-stream" },
        });
      }),
    );
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const { user } = renderWithProviders(<PersonaPanel projectId="p1" />);
    await screen.findByText("Alpha");

    await user.click(screen.getByRole("button", { name: /Data Files/ }));
    expect(await screen.findByText("wave1.xlsx")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Download wave1.xlsx" }));
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(downloadBody).toMatchObject({ project_id: "p1", file_id: "f1" });
    expect(createObjectURL).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("shows an empty state when no data files were uploaded", async () => {
    seedPersonas([makePersona()]);
    server.use(http.post(`${API_URL}projects/files/list`, () => ok({ files: [] })));
    const { user } = renderWithProviders(<PersonaPanel projectId="p1" />);
    await screen.findByText("Alpha");

    await user.click(screen.getByRole("button", { name: /Data Files/ }));
    expect(await screen.findByText("No data files yet")).toBeInTheDocument();
  });
});
