import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { server } from "@/test/msw/server";
import { API_URL } from "@/test/msw/handlers";
import { apiRequest } from "../../services/apiService";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const endpoint = (path: string) => `${API_URL}${path}`;

describe("apiRequest", () => {
  it("wraps a success envelope under { response }", async () => {
    server.use(
      http.post(endpoint("echo"), () =>
        HttpResponse.json({
          header: { code: 200, message: "ok" },
          response: { value: 42 },
        }),
      ),
    );

    const res = await apiRequest("post", "echo", { a: 1 });
    expect(res.response.response).toEqual({ value: 42 });
  });

  it("returns the body directly for the legacy top-level code 200 shape", async () => {
    server.use(
      http.post(endpoint("legacy"), () =>
        HttpResponse.json({ code: 200, data: "x" }),
      ),
    );

    const res = await apiRequest("post", "legacy", {});
    expect(res).toEqual({ code: 200, data: "x" });
  });

  it("toasts and throws on a non-401 error envelope", async () => {
    server.use(
      http.post(endpoint("bad"), () =>
        HttpResponse.json({ header: { code: 400, message: "Bad input" } }),
      ),
    );

    await expect(apiRequest("post", "bad", {})).rejects.toThrow("Bad input");
    expect(toast.error).toHaveBeenCalledWith("Bad input");
  });

  it("surfaces a network error message on a transport failure", async () => {
    server.use(http.post(endpoint("down"), () => HttpResponse.error()));

    await expect(apiRequest("post", "down", {})).rejects.toThrow(
      /network error/i,
    );
    expect(toast.error).toHaveBeenCalledWith(
      "Network error. Please check your connection and try again.",
    );
  });

  it("attaches the bearer token from localStorage to requests", async () => {
    localStorage.setItem("token", "my-token");
    let authHeader: string | null = null;
    server.use(
      http.post(endpoint("secure"), ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ header: { code: 200 }, response: {} });
      }),
    );

    await apiRequest("post", "secure", {});
    expect(authHeader).toBe("Bearer my-token");
  });

  it("persists a token returned in the response authorization header", async () => {
    server.use(
      http.post(endpoint("issue"), () =>
        HttpResponse.json(
          { header: { code: 200 }, response: {} },
          { headers: { authorization: "fresh-token" } },
        ),
      ),
    );

    await apiRequest("post", "issue", {});
    expect(localStorage.getItem("token")).toBe("fresh-token");
  });

  describe("on a 401 envelope", () => {
    // Note: the handler sets `window.location.href = "/"`. In jsdom that is a
    // (logged) no-op rather than a real navigation, and replacing the location
    // object breaks axios's XHR path, so we assert on the *observable* session
    // teardown instead — storage cleared and the session-expired toast.
    it("clears storage and surfaces the session-expired toast", async () => {
      localStorage.setItem("token", "stale");
      sessionStorage.setItem("k", "v");
      server.use(
        http.post(endpoint("expired"), () =>
          HttpResponse.json({
            header: { code: 401, message: "error" },
            response: null,
          }),
        ),
      );

      await apiRequest("post", "expired", {});

      expect(toast.error).toHaveBeenCalledWith(
        "Your session has expired. Please log in again.",
      );
      expect(localStorage.getItem("token")).toBeNull();
      expect(sessionStorage.getItem("k")).toBeNull();
    });
  });
});
