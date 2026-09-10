import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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

function seedNoHistory() {
  server.use(
    http.post(`${API_URL}persona/group-chat/history`, () =>
      ok({ messages: [], pagination: { total: 0 } }),
    ),
  );
}

function seedAssumptions(assumptions: GroupAssumption[]) {
  server.use(
    http.post(`${API_URL}persona/group-chat/assumptions/list`, () =>
      ok({ assumptions, count: assumptions.length, max_allowed: 20 }),
    ),
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

  it("opens the assumptions dialog", async () => {
    seedParticipants();
    seedNoHistory();
    seedAssumptions([]);
    const { user } = renderWithProviders(<GroupChatView />);
    await user.click(await screen.findByRole("button", { name: /assumptions/i }));
    expect(await screen.findByText(/no assumptions yet/i)).toBeInTheDocument();
  });

  it("badges the header with the number of applied assumptions", async () => {
    seedParticipants();
    seedNoHistory();
    seedAssumptions([
      {
        assumption_id: "a1",
        text: "Product costs $34.99",
        source: "manual",
        reason: null,
        created_at: null,
      },
      {
        assumption_id: "a2",
        text: "Sold only online",
        source: "manual",
        reason: null,
        created_at: null,
      },
    ]);

    renderWithProviders(<GroupChatView />);
    const button = await screen.findByRole("button", { name: /assumptions/i });
    await waitFor(() => expect(within(button).getByText("2")).toBeInTheDocument());
  });

  it("adds a typed assumption through the dialog", async () => {
    seedParticipants();
    seedNoHistory();
    seedAssumptions([]);
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}persona/group-chat/assumptions/add`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok({
          status: "approved",
          assumption: {
            assumption_id: "a1",
            text: "Budget conscious shoppers",
            source: "manual",
                reason: "Fits these personas.",
            created_at: null,
          },
        });
      }),
    );

    const { user } = renderWithProviders(<GroupChatView />);
    await user.click(await screen.findByRole("button", { name: /assumptions/i }));
    await screen.findByText(/no assumptions yet/i);

    await user.type(screen.getByLabelText("New assumption"), "Budget conscious shoppers");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({
      group_id: "g1",
      text: "Budget conscious shoppers",
    });
  });
});
