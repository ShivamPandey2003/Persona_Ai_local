import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { http } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok } from "@/test/msw/handlers";
import { authenticate } from "@/test/factories";
import PersonaPanelDialog from "./PersonaPanelDialog";

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => vi.fn(),
}));

beforeEach(() => authenticate());

describe("PersonaPanelDialog", () => {
  it("is hidden when the persona dialog flag is off", () => {
    renderWithProviders(<PersonaPanelDialog />, {
      preloadedState: { Project: { projects: [], personaDialog: false } },
    });
    expect(screen.queryByRole("heading", { name: "Persona Panel" })).not.toBeInTheDocument();
  });

  it("renders the persona panel when the dialog flag is on", async () => {
    server.use(
      http.post(`${API_URL}persona/list`, () => ok({ personas: [] })),
      http.post(`${API_URL}persona/dashboard`, () =>
        ok({ summary: { personas_created: 0, insufficient_data: 0, data_files: 0 }, personas: [] }),
      ),
    );
    renderWithProviders(<PersonaPanelDialog />, {
      preloadedState: { Project: { projects: [], personaDialog: true } },
    });

    expect(await screen.findByRole("heading", { name: "Persona Panel" })).toBeInTheDocument();
  });
});
