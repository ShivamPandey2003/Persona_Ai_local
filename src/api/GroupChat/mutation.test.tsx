import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "@/test/msw/server";
import { API_URL, ok } from "@/test/msw/handlers";
import { createHookWrapper } from "@/test/test-utils";
import { authenticate } from "@/test/factories";
import { getSession } from "@/lib/chatStore";
import {
  useStartGroupChat,
  useGroupBroadcast,
  useGroupMessageSingle,
} from "./mutation";

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigateSpy,
}));

beforeEach(() => {
  navigateSpy.mockReset();
  authenticate();
});

describe("useStartGroupChat", () => {
  it("starts a group chat, persists a session and navigates", async () => {
    server.use(
      http.post(`${API_URL}persona/group-chat/message`, () =>
        ok({ group_id: "grp-1", message: "started" }),
      ),
    );
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStartGroupChat(), { wrapper: Wrapper });

    act(() =>
      result.current.mutate({
        projectId: "p1",
        personaIds: ["a", "b"],
        title: "Strategy session",
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(navigateSpy).toHaveBeenCalledWith("/group-chat/grp-1", {
      state: { projectId: "p1" },
    });
    expect(getSession("grp-1")).toMatchObject({
      kind: "group",
      title: "Strategy session",
      personaIds: ["a", "b"],
    });
  });
});

describe("useGroupBroadcast", () => {
  it("broadcasts a message and returns every persona reply", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${API_URL}persona/group-chat/message`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok({
          responses: [
            { persona_id: "a", persona_name: "Ann", response: "Hi", evidence_tags: [] },
          ],
        });
      }),
    );
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useGroupBroadcast("grp-1"), {
      wrapper: Wrapper,
    });

    act(() => result.current.mutate({ message: "Hello team" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(body).toMatchObject({
      flow: "message",
      group_id: "grp-1",
      message: "Hello team",
    });
    expect(result.current.data?.responses).toHaveLength(1);
  });
});

describe("useGroupMessageSingle", () => {
  it("messages a single persona within the group", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${API_URL}persona/group-chat/message-single`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok({ response: { persona_name: "Ann", message: "Sure" } });
      }),
    );
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useGroupMessageSingle("grp-1"), {
      wrapper: Wrapper,
    });

    act(() => result.current.mutate({ personaId: "a", message: "Just you" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(body).toMatchObject({
      group_id: "grp-1",
      persona_id: "a",
      message: "Just you",
    });
  });
});
