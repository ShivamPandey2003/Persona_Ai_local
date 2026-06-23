import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "@/test/msw/server";
import { API_URL, ok } from "@/test/msw/handlers";
import { createHookWrapper } from "@/test/test-utils";
import { authenticate } from "@/test/factories";
import { useChatList, useBuilderHistory } from "@/api/Chat/query";

beforeEach(() => authenticate());

describe("useChatList", () => {
  it("normalises and sorts builder and group chats newest-first", async () => {
    server.use(
      http.post(`${API_URL}persona/chat-list`, () =>
        ok({
          builder_chats: [
            {
              conversation_id: "b1",
              project_id: "p1",
              status: "active",
              created_at: "2026-01-01T00:00:00Z",
            },
          ],
          group_chats: [
            {
              group_id: "g1",
              project_id: "p1",
              persona_ids: ["x", "y"],
              status: "active",
              created_at: "2026-02-01T00:00:00Z",
            },
          ],
        }),
      ),
    );
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useChatList("p1"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = result.current.data!;
    expect(items).toHaveLength(2);
    // Group chat (Feb) sorts before the builder chat (Jan).
    expect(items[0]).toMatchObject({
      id: "g1",
      kind: "group",
      to: "/group-chat/g1",
      title: "Group chat · 2 personas",
    });
    expect(items[1]).toMatchObject({ id: "b1", kind: "builder", to: "/chat/b1" });
  });

  it("is disabled without a projectId", () => {
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useChatList(undefined), {
      wrapper: Wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useBuilderHistory", () => {
  it("flattens each turn into user then assistant bubbles", async () => {
    server.use(
      http.post(`${API_URL}persona/chat/history`, () =>
        ok({
          messages: [{ user_message: "hi", response: "hello there" }],
          pagination: { total: 1 },
        }),
      ),
    );
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useBuilderHistory("conv-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      message: "hi",
      userType: "User",
    });
    expect(result.current.messages[1]).toMatchObject({
      message: "hello there",
      userType: "Assistant",
    });
  });
});
