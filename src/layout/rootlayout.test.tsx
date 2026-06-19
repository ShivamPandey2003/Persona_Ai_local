import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { authenticate } from "@/test/factories";
import Rootlayout from "./rootlayout";

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => vi.fn(),
}));

beforeEach(() => authenticate());

describe("Rootlayout", () => {
  it("shows the Dashboard title on the dashboard route", () => {
    renderWithProviders(<Rootlayout />, { route: "/dashboard" });
    // The header title and the sidebar nav both reference Dashboard.
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
  });

  it("shows the Settings title on the settings route", () => {
    renderWithProviders(<Rootlayout />, { route: "/settings" });
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("renders the sidebar brand", () => {
    renderWithProviders(<Rootlayout />, { route: "/dashboard" });
    expect(screen.getByText("Persona AI")).toBeInTheDocument();
  });
});
