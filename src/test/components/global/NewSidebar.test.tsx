import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { http } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok } from "@/test/msw/handlers";
import { authenticate } from "@/test/factories";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NewAppSidebar } from "../../../components/global/NewSidebar";

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigateSpy,
}));

const renderSidebar = (entry: string | { pathname: string; state?: unknown }) =>
  renderWithProviders(
    <SidebarProvider>
      <NewAppSidebar />
    </SidebarProvider>,
    { routerEntries: [entry as string] },
  );

beforeEach(() => {
  navigateSpy.mockReset();
  authenticate();
});

describe("NewAppSidebar", () => {
  it("renders the brand and core navigation links", () => {
    renderSidebar("/dashboard");
    expect(screen.getByText("Persona AI")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("does not show chat actions outside of chat routes", () => {
    renderSidebar("/dashboard");
    expect(screen.queryByText("New chat")).not.toBeInTheDocument();
  });

  it("shows chat actions and recents on a chat route", async () => {
    server.use(
      http.post(`${API_URL}persona/chat-list`, () =>
        ok({
          builder_chats: [
            { conversation_id: "c1", project_id: "p1", status: "active", created_at: "2026-01-01T00:00:00Z" },
          ],
          group_chats: [],
        }),
      ),
    );
    renderSidebar({ pathname: "/chat/c1", state: { projectId: "p1" } });

    expect(screen.getByText("New chat")).toBeInTheDocument();
    expect(screen.getByText("Start Group Chat")).toBeInTheDocument();
    // Recents come from the chat-list query.
    expect(await screen.findByText("Persona chat")).toBeInTheDocument();
  });

  it("opens the persona group-chat dialog via redux", async () => {
    const { user, store } = renderSidebar({
      pathname: "/chat/c1",
      state: { projectId: "p1" },
    });
    await user.click(screen.getByText("Start Group Chat"));
    expect(store.getState().Project.personaDialog).toBe(true);
  });
});
