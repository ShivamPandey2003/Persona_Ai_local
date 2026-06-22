import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, delay } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok } from "@/test/msw/handlers";
import PersonaAILoginPage from "../../pages/Login2";

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigateSpy,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => navigateSpy.mockReset());

describe("PersonaAILoginPage", () => {
  it("renders the welcome heading and the credential fields", () => {
    renderWithProviders(<PersonaAILoginPage />);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  });

  it("logs in and navigates to the dashboard on success", async () => {
    server.use(
      http.post(`${API_URL}users/login`, () =>
        ok({ token: "tok", firstName: "Ada", lastName: "Lovelace" }),
      ),
    );
    const { user } = renderWithProviders(<PersonaAILoginPage />);

    await user.type(screen.getByPlaceholderText("Enter your email"), "ada@x.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "secret12");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith("/dashboard"));
    expect(JSON.parse(atob(localStorage.getItem("user")!)).token).toBe("tok");
  });

  it("shows a verifying state while the request is in flight", async () => {
    server.use(
      http.post(`${API_URL}users/login`, async () => {
        await delay("infinite");
        return ok({ token: "t", firstName: "A", lastName: "B" });
      }),
    );
    const { user } = renderWithProviders(<PersonaAILoginPage />);

    await user.type(screen.getByPlaceholderText("Enter your email"), "a@b.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "pw123456");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/verifying/i)).toBeInTheDocument();
  });
});
