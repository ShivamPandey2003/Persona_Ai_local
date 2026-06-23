import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok, envelopeError } from "@/test/msw/handlers";
import { authenticate } from "@/test/factories";
import GroupChatView from "../../../../components/common/Chat/GroupChat/GroupChatView";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useParams: () => ({ groupId: "g1" }),
  useNavigate: () => vi.fn(),
}));

const participants = [
  { persona_id: "a", persona_name: "Ann", color: "green" },
  { persona_id: "b", persona_name: "Bob", color: "blue" },
];

function seedParticipants() {
  server.use(
    http.post(`${API_URL}persona/group-chat/participants`, () => ok({ participants })),
  );
}

beforeEach(() => authenticate());

describe("GroupChatView", () => {
  it("renders the transcript history", async () => {
    seedParticipants();
    server.use(
      http.post(`${API_URL}persona/group-chat/history`, () =>
        ok({
          messages: [
            {
              user_message: "What matters?",
              responses: [{ persona_id: "a", persona_name: "Ann", response: "Affordability" }],
            },
          ],
          pagination: { total: 1 },
        }),
      ),
    );
    renderWithProviders(<GroupChatView />);

    expect(await screen.findByText("What matters?")).toBeInTheDocument();
    expect(screen.getByText("Affordability")).toBeInTheDocument();
  });

  it("prompts the user when there is no history yet", async () => {
    seedParticipants();
    server.use(
      http.post(`${API_URL}persona/group-chat/history`, () =>
        ok({ messages: [], pagination: { total: 0 } }),
      ),
    );
    renderWithProviders(<GroupChatView />);
    expect(await screen.findByText(/ask a question to hear from/i)).toBeInTheDocument();
  });

  it("broadcasts a message to everyone and reveals the reply", async () => {
    seedParticipants();
    server.use(
      http.post(`${API_URL}persona/group-chat/history`, () =>
        ok({ messages: [], pagination: { total: 0 } }),
      ),
    );
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}persona/group-chat/message`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok({
          responses: [{ persona_id: "a", persona_name: "Ann", response: "Go for it", evidence_tags: [] }],
        });
      }),
    );

    const { user } = renderWithProviders(<GroupChatView />);
    const textarea = await screen.findByPlaceholderText(/message everyone/i);
    await user.type(textarea, "Should we launch?{Enter}");

    expect(screen.getByText("Should we launch?")).toBeInTheDocument(); // optimistic
    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ flow: "message", group_id: "g1", message: "Should we launch?" });
    expect(await screen.findByText("Go for it")).toBeInTheDocument();
  });

  it("shows an error state when participants fail to load", async () => {
    server.use(
      http.post(`${API_URL}persona/group-chat/participants`, () =>
        envelopeError(500, "error"),
      ),
      http.post(`${API_URL}persona/group-chat/history`, () =>
        ok({ messages: [], pagination: { total: 0 } }),
      ),
    );
    renderWithProviders(<GroupChatView />);
    expect(await screen.findByText(/couldn't load this group chat/i)).toBeInTheDocument();
  });

  it("opens the shared assumptions dialog", async () => {
    seedParticipants();
    server.use(
      http.post(`${API_URL}persona/group-chat/history`, () =>
        ok({ messages: [], pagination: { total: 0 } }),
      ),
    );
    const { user } = renderWithProviders(<GroupChatView />);
    await user.click(await screen.findByRole("button", { name: /assumptions/i }));
    expect(await screen.findByText("Shared assumptions")).toBeInTheDocument();
  });

  it("saves shared assumptions to the group context", async () => {
    seedParticipants();
    server.use(
      http.post(`${API_URL}persona/group-chat/history`, () =>
        ok({ messages: [], pagination: { total: 0 } }),
      ),
    );
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}persona/group-chat/context`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok({});
      }),
    );

    const { user } = renderWithProviders(<GroupChatView />);
    await user.click(await screen.findByRole("button", { name: /assumptions/i }));
    await screen.findByText("Shared assumptions");

    await user.type(
      screen.getByPlaceholderText(/natural electrolytes/i),
      "Budget conscious",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ group_id: "g1", assumptions: ["Budget conscious"] });
  });
});
