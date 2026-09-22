import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok } from "@/test/msw/handlers";
import { VOICE_ENDPOINTS } from "@/api/Voice/endpoints";
import { authenticate } from "@/test/factories";
import { speechPlayer } from "@/lib/voice/speechPlayer";
import { SPEAKER_PREFERENCE_KEY } from "@/hooks/useSpeakerPreference";
import GroupChatView from "../../../../components/common/Chat/GroupChat/GroupChatView";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

let routeGroupId = "g1";
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useParams: () => ({ groupId: routeGroupId }),
  useNavigate: () => vi.fn(),
}));

const participants = [
  { persona_id: "a", persona_name: "Ann", color: "green" },
  { persona_id: "b", persona_name: "Bob", color: "blue" },
];

function seedChat(history: unknown[] = []) {
  server.use(
    http.post(`${API_URL}persona/group-chat/participants`, () => ok({ participants })),
    http.post(`${API_URL}persona/group-chat/history`, () =>
      ok({ messages: history, pagination: { total: history.length } }),
    ),
    http.post(`${API_URL}persona/group-chat/assumptions/list`, () =>
      ok({ assumptions: [], count: 0, max_allowed: 20 }),
    ),
  );
}

function voiceConfig(stt: boolean, tts: boolean) {
  server.use(
    http.post(`${API_URL}${VOICE_ENDPOINTS.config}`, () => ok({ stt: { enabled: stt }, tts: { enabled: tts } })),
  );
}

let enqueue: MockInstance<typeof speechPlayer.enqueue>;
let prefetch: MockInstance<typeof speechPlayer.prefetch>;
let stop: MockInstance<typeof speechPlayer.stop>;
let prime: MockInstance<typeof speechPlayer.prime>;

beforeEach(() => {
  routeGroupId = "g1";
  authenticate();
  // Real audio can't play in jsdom; assert on what the view asks the player to do.
  enqueue = vi.spyOn(speechPlayer, "enqueue").mockImplementation(() => {});
  prefetch = vi.spyOn(speechPlayer, "prefetch").mockImplementation(() => {});
  stop = vi.spyOn(speechPlayer, "stop").mockImplementation(() => {});
  vi.spyOn(speechPlayer, "toggle").mockImplementation(() => {});
  prime = vi.spyOn(speechPlayer, "prime").mockImplementation(() => {});
});

describe("GroupChatView voice", () => {
  it("hides voice controls when the backend has voice off", async () => {
    seedChat();
    voiceConfig(false, false);
    renderWithProviders(<GroupChatView />);
    await screen.findByPlaceholderText(/message everyone/i);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /read replies aloud/i })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /record voice message/i })).not.toBeInTheDocument();
  });

  it("hides the mic in browsers that can't record", async () => {
    seedChat();
    renderWithProviders(<GroupChatView />);
    expect(await screen.findByRole("button", { name: /read replies aloud/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record voice message/i })).not.toBeInTheDocument();
  });

  it("turns read-aloud on and off", async () => {
    seedChat();
    const { user } = renderWithProviders(<GroupChatView />);
    const toggleButton = await screen.findByRole("button", { name: "Read replies aloud" });
    expect(toggleButton).toHaveAttribute("aria-pressed", "false");

    await user.click(toggleButton);
    expect(prime).toHaveBeenCalled();
    const on = screen.getByRole("button", { name: /stop reading replies aloud/i });
    expect(on).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(SPEAKER_PREFERENCE_KEY)).toBe("on");

    stop.mockClear();
    await user.click(on);
    expect(stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Read replies aloud" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("never reads history aloud", async () => {
    localStorage.setItem(SPEAKER_PREFERENCE_KEY, "on");
    seedChat([
      {
        user_message: "What matters?",
        responses: [{ persona_id: "a", persona_name: "Ann", response: "Affordability" }],
      },
    ]);
    renderWithProviders(<GroupChatView />);
    expect(await screen.findByText("Affordability")).toBeInTheDocument();
    await screen.findByRole("button", { name: /stop reading replies aloud/i });
    expect(enqueue).not.toHaveBeenCalled();
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("reads broadcast replies aloud in order as they appear", async () => {
    localStorage.setItem(SPEAKER_PREFERENCE_KEY, "on");
    seedChat();
    server.use(
      http.post(`${API_URL}persona/group-chat/message`, () =>
        ok({
          responses: [
            { persona_id: "a", persona_name: "Ann", response: "Yes", evidence_tags: [] },
            { persona_id: "b", persona_name: "Bob", response: "No", evidence_tags: [] },
          ],
        }),
      ),
    );
    const { user } = renderWithProviders(<GroupChatView />);
    await screen.findByRole("button", { name: /stop reading replies aloud/i });
    await user.type(await screen.findByPlaceholderText(/message everyone/i), "Launch?{Enter}");

    expect(stop).toHaveBeenCalled(); // a new question interrupts reading
    await waitFor(() => expect(enqueue).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(prefetch.mock.calls.map(([item]) => item)).toEqual([
      { text: "Yes", speakerKey: "Ann", groupId: "g1" },
      { text: "No", speakerKey: "Bob", groupId: "g1" },
    ]);
    // The group lets the backend use each persona's stored voice.
    expect(
      enqueue.mock.calls.map(([item]) => [item.text, item.speakerKey, item.groupId]),
    ).toEqual([
      ["Yes", "Ann", "g1"],
      ["No", "Bob", "g1"],
    ]);
  });

  it("doesn't read replies when read-aloud is off", async () => {
    seedChat();
    server.use(
      http.post(`${API_URL}persona/group-chat/message`, () =>
        ok({ responses: [{ persona_id: "a", persona_name: "Ann", response: "Sure", evidence_tags: [] }] }),
      ),
    );
    const { user } = renderWithProviders(<GroupChatView />);
    await user.type(await screen.findByPlaceholderText(/message everyone/i), "Hi{Enter}");
    expect(await screen.findByText("Sure")).toBeInTheDocument();
    expect(enqueue).not.toHaveBeenCalled();
  });

  // Per-message read-aloud button is hidden behind
  // PER_MESSAGE_SPEAKER_BUTTON_ENABLED = false in GroupChatView.tsx; flip that
  // flag back and restore this test to click it (see git history) once re-enabled.
  it("does not show a per-bubble read-aloud button while it's hidden", async () => {
    seedChat([
      {
        user_message: "What matters?",
        responses: [{ persona_id: "a", persona_name: "Ann", response: "Affordability" }],
      },
    ]);
    renderWithProviders(<GroupChatView />);
    const reply = await screen.findByText("Affordability");
    const bubble = reply.closest(".group") as HTMLElement;
    expect(within(bubble).queryByRole("button", { name: /read aloud/i })).not.toBeInTheDocument();
  });

  it("turns read-aloud off when the browser blocks playback", async () => {
    localStorage.setItem(SPEAKER_PREFERENCE_KEY, "on");
    let blocked: () => void = () => {};
    vi.spyOn(speechPlayer, "onAutoplayBlocked").mockImplementation((listener) => {
      blocked = listener;
      return () => {};
    });
    seedChat();
    renderWithProviders(<GroupChatView />);
    await screen.findByRole("button", { name: /stop reading replies aloud/i });

    blocked();
    expect(
      await screen.findByRole("button", { name: "Read replies aloud" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("drops replies that arrive after switching to another chat", async () => {
    localStorage.setItem(SPEAKER_PREFERENCE_KEY, "on");
    seedChat();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(`${API_URL}persona/group-chat/message`, async () => {
        await gate;
        return ok({
          responses: [{ persona_id: "a", persona_name: "Ann", response: "Stale", evidence_tags: [] }],
        });
      }),
    );
    const { user, rerender } = renderWithProviders(<GroupChatView />);
    await screen.findByRole("button", { name: /stop reading replies aloud/i });
    await user.type(await screen.findByPlaceholderText(/message everyone/i), "Hello{Enter}");

    routeGroupId = "g2";
    rerender(<GroupChatView />);
    release();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByText("Stale")).not.toBeInTheDocument();
    expect(enqueue).not.toHaveBeenCalled();
  });

  describe("dictation", () => {
    class FakeRecorder {
      static isTypeSupported = () => true;
      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["x".repeat(4096)]) });
        this.onstop?.();
      }
    }

    beforeEach(() => {
      vi.stubGlobal("MediaRecorder", FakeRecorder);
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
        },
      });
      // Every clock read moves a second on, so the clip is long enough to keep.
      let now = 0;
      vi.spyOn(Date, "now").mockImplementation(() => (now += 1_000));
    });

    it("puts the transcript in the input without sending it", async () => {
      seedChat();
      let sent = false;
      server.use(
        http.post(`${API_URL}persona/group-chat/message`, () => {
          sent = true;
          return HttpResponse.json({});
        }),
      );
      const { user } = renderWithProviders(<GroupChatView />);
      const input = await screen.findByPlaceholderText(/message everyone/i);
      await user.type(input, "Also,");

      await user.click(await screen.findByRole("button", { name: /record voice message/i }));
      expect(stop).toHaveBeenCalled(); // never records over a reply being read
      await user.click(await screen.findByRole("button", { name: /stop recording/i }));

      await waitFor(() => expect(input).toHaveValue("Also, hello from the mic"));
      expect(sent).toBe(false);
    });

    it("locks the rest of the bar and shows a timer while recording", async () => {
      seedChat();
      const { user } = renderWithProviders(<GroupChatView />);
      const input = await screen.findByPlaceholderText(/message everyone/i);
      await screen.findByRole("button", { name: /read replies aloud/i });

      await user.click(await screen.findByRole("button", { name: /record voice message/i }));
      expect(await screen.findByText("Listening")).toBeInTheDocument();
      // Counts down from the backend's limit.
      expect(screen.getByTestId("recording-timer")).toHaveTextContent("0:30");

      expect(input).toBeDisabled();
      expect(screen.getByRole("button", { name: /attach images/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /read replies aloud/i })).toBeDisabled();
      expect(screen.getByRole("combobox", { name: /choose who to message/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /assumptions/i })).toBeDisabled();
      // The mic itself stays usable so recording can be stopped.
      expect(screen.getByRole("button", { name: /stop recording/i })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: /discard recording/i }));
      await waitFor(() => expect(input).toBeEnabled());
      expect(screen.queryByText("Listening")).not.toBeInTheDocument();
      expect(input).toHaveValue("");
    });

    it("takes the recording limit from the backend config", async () => {
      seedChat();
      server.use(
        http.post(`${API_URL}${VOICE_ENDPOINTS.config}`, () =>
          ok({
            stt: { enabled: true },
            tts: { enabled: true },
            limits: { max_recording_seconds: 20 },
          }),
        ),
      );
      const { user } = renderWithProviders(<GroupChatView />);
      await screen.findByRole("button", { name: /read replies aloud/i });
      await user.click(await screen.findByRole("button", { name: /record voice message/i }));
      expect(await screen.findByTestId("recording-timer")).toHaveTextContent("0:20");
    });

    it("shows a transcribing message until the text arrives", async () => {
      seedChat();
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => (release = resolve));
      server.use(
        http.post(`${API_URL}${VOICE_ENDPOINTS.stt}`, async () => {
          await gate;
          return ok({ text: "done talking", duration_seconds: 1, latency_ms: 5 });
        }),
      );
      const { user } = renderWithProviders(<GroupChatView />);
      const input = await screen.findByPlaceholderText(/message everyone/i);

      await user.click(await screen.findByRole("button", { name: /record voice message/i }));
      await user.click(await screen.findByRole("button", { name: /stop recording/i }));

      expect(await screen.findByText(/transcribing your voice/i)).toBeInTheDocument();
      expect(input).toBeDisabled();

      release();
      await waitFor(() => expect(input).toHaveValue("done talking"));
      expect(input).toBeEnabled();
      expect(screen.queryByText(/transcribing your voice/i)).not.toBeInTheDocument();
    });
  });
});
