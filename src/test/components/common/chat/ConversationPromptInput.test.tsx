import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok, envelopeError } from "@/test/msw/handlers";
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
        ok({ messages: [], pagination: { total: 0 } }),
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
        ok({ messages: [], pagination: { total: 0 } }),
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
});
