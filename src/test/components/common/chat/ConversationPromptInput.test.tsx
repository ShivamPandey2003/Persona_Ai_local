import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import {
  API_URL,
  ok,
  envelopeError,
  dataSourceOptions,
} from "@/test/msw/handlers";
import { authenticate } from "@/test/factories";
import ConversationPromptInput from "../../../../components/common/Chat/ConversationPromptInput";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useParams: () => ({ id: "c1" }),
  useNavigate: () => vi.fn(),
}));

beforeEach(() => authenticate());

describe("ConversationPromptInput", () => {
  it("rehydrates and renders the conversation history", async () => {
    server.use(
      http.post(`${API_URL}persona/chat/history`, () =>
        ok({
          messages: [{ user_message: "hi", response: "hello there" }],
          pagination: { total: 1 },
        }),
      ),
    );
    renderWithProviders(<ConversationPromptInput />);

    expect(await screen.findByText("hi")).toBeInTheDocument();
    expect(screen.getByText("hello there")).toBeInTheDocument();
  });

  it("sends a builder message and shows the optimistic + assistant turns", async () => {
    server.use(
      http.post(`${API_URL}persona/chat/history`, () =>
        // data_source_selected unlocks the composer — see the gate tests below.
        ok({ messages: [], pagination: { total: 0 }, data_source_selected: true }),
      ),
    );
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}persona/chat/message`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok({
          id: "c1",
          messages: [{ role: "assistant", content: "Got it!" }],
          building_persona: 0,
        });
      }),
    );

    const { user } = renderWithProviders(<ConversationPromptInput />);
    const textarea = await screen.findByPlaceholderText(/describe your target persona/i);
    await user.type(textarea, "Build me a persona{Enter}");

    expect(screen.getByText("Build me a persona")).toBeInTheDocument(); // optimistic
    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ flow: "message", conversation_id: "c1", message: "Build me a persona" });
    expect(await screen.findByText("Got it!")).toBeInTheDocument();
  });

  it("shows the build progress and ends the chat when personas start building", async () => {
    server.use(
      http.post(`${API_URL}persona/chat/history`, () =>
        ok({ messages: [], pagination: { total: 0 }, data_source_selected: true }),
      ),
      http.post(`${API_URL}persona/chat/message`, () =>
        ok({
          id: "c1",
          messages: [{ role: "assistant", content: "Building now" }],
          building_persona: 1,
          job_id: "job-1",
        }),
      ),
      http.post(`${API_URL}projects/job-status`, () =>
        ok({ job_id: "job-1", status: "running", progress: 40, result: null }),
      ),
    );

    const { user } = renderWithProviders(<ConversationPromptInput />);
    const textarea = await screen.findByPlaceholderText(/describe your target persona/i);
    await user.type(textarea, "make my personas{Enter}");

    expect(await screen.findByText(/building your personas/i)).toBeInTheDocument();
    expect(await screen.findByText(/this conversation has ended/i)).toBeInTheDocument();
  });

  it("rehydrates a finished build card from history when the chat is reopened", async () => {
    const doneStep = {
      key: "finalizing",
      label: "Saving results",
      status: "done",
      done: 2,
      failed: 0,
      total: 2,
    };
    server.use(
      http.post(`${API_URL}persona/chat/history`, () =>
        ok({
          messages: [{ user_message: "make personas", response: "Building now" }],
          pagination: { total: 1 },
          // The persisted build snapshot: the loader is long gone, but the
          // outcome must still show in the transcript.
          build: { job_id: "job-9", status: "done", progress: 100, steps: [doneStep] },
        }),
      ),
      http.post(`${API_URL}projects/job-status`, () =>
        ok({
          job_id: "job-9",
          status: "done",
          progress: 100,
          result: { personas: [] },
          steps: [doneStep],
        }),
      ),
    );

    renderWithProviders(<ConversationPromptInput />);
    // Reads as a finished record, not a perpetual "building" state.
    expect(await screen.findByText(/personas built/i)).toBeInTheDocument();
    expect(screen.getByText("Saving results")).toBeInTheDocument();
  });

  it("shows an error message when the history fails to load", async () => {
    server.use(
      http.post(`${API_URL}persona/chat/history`, () => envelopeError(500, "error")),
    );
    renderWithProviders(<ConversationPromptInput />);
    expect(await screen.findByText(/couldn't load this conversation/i)).toBeInTheDocument();
  });

  it("opens the persona panel via the View Personas button", async () => {
    server.use(
      http.post(`${API_URL}persona/chat/history`, () =>
        ok({ messages: [], pagination: { total: 0 } }),
      ),
    );
    const { user, store } = renderWithProviders(<ConversationPromptInput />);
    await user.click(await screen.findByRole("button", { name: /view personas/i }));
    expect(store.getState().Project.personaDialog).toBe(true);
  });

  /* ---------------------------------------------------------------- */
  /* Data source must be chosen before any requirements are gathered   */
  /* ---------------------------------------------------------------- */
  describe("data-source gate", () => {
    const unselectedHistory = () =>
      server.use(
        http.post(`${API_URL}persona/chat/history`, () =>
          ok({
            messages: [{ user_message: null, response: "Welcome." }],
            pagination: { total: 1 },
            data_source: "master",
            data_source_selected: false,
            data_source_locked: false,
          }),
        ),
      );

    it("locks the composer until a data source is chosen", async () => {
      unselectedHistory();
      renderWithProviders(<ConversationPromptInput />);

      const box = await screen.findByPlaceholderText(/select a data source to start/i);
      expect(box).toBeDisabled();
      expect(
        screen.getByText(/choose which data to build these personas from/i),
      ).toBeInTheDocument();
    });

    it("does not send a message while the gate is up", async () => {
      let sent = false;
      unselectedHistory();
      server.use(
        http.post(`${API_URL}persona/chat/message`, () => {
          sent = true;
          return ok({ id: "c1", messages: [], building_persona: 0 });
        }),
      );
      const { user } = renderWithProviders(<ConversationPromptInput />);

      const box = await screen.findByPlaceholderText(/select a data source to start/i);
      await user.type(box, "low sugar drinks{Enter}");
      expect(sent).toBe(false);
    });

    it("unlocks the composer once a source is confirmed", async () => {
      unselectedHistory();
      server.use(
        http.post(`${API_URL}persona/chat/data-sources`, () =>
          ok(dataSourceOptions({ allAvailable: true })),
        ),
        http.post(`${API_URL}persona/chat/data-source`, () =>
          ok({ conversation_id: "c1", data_source: "combined" }),
        ),
      );
      // The picker needs the chat's project to ask which datasets are available;
      // it comes from the route state, as it does in the app.
      const { user } = renderWithProviders(<ConversationPromptInput />, {
        routerEntries: [{ pathname: "/chat/c1", state: { projectId: "p1" } }] as never,
      });

      // The prompt above the composer opens the same dialog as the toolbar chip.
      await user.click(
        await screen.findByRole("button", { name: /^choose data source$/i }),
      );
      await user.click(
        await screen.findByRole("radio", { name: /^master \+ my uploaded data/i }),
      );
      await user.click(screen.getByRole("button", { name: /^confirm$/i }));

      expect(
        await screen.findByPlaceholderText(/describe your target persona/i),
      ).toBeEnabled();
      // The chip now reports the chosen dataset instead of asking for one.
      expect(
        screen.getByRole("button", { name: /master \+ my uploaded data/i }),
      ).toBeInTheDocument();
    });

    it("stays unlocked for a chat that already has a source", async () => {
      server.use(
        http.post(`${API_URL}persona/chat/history`, () =>
          ok({
            messages: [],
            pagination: { total: 0 },
            data_source: "uploaded",
            data_source_selected: true,
          }),
        ),
      );
      renderWithProviders(<ConversationPromptInput />);

      expect(
        await screen.findByPlaceholderText(/describe your target persona/i),
      ).toBeEnabled();
      expect(
        screen.queryByText(/choose which data to build these personas from/i),
      ).toBeNull();
    });
  });
});
