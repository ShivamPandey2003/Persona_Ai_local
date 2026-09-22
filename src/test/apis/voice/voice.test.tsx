import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { server } from "@/test/msw/server";
import { API_URL, envelopeError, ok } from "@/test/msw/handlers";
import { VOICE_ENDPOINTS } from "@/api/Voice/endpoints";
import { authenticate } from "@/test/factories";
import { createHookWrapper } from "@/test/test-utils";
import { synthesizeSpeech, transcribeAudio, useVoiceConfig } from "@/api/Voice/voice";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => authenticate("voice-token"));

describe("useVoiceConfig", () => {
  it("loads which voice features are available", async () => {
    let body: unknown;
    server.use(
      http.post(`${API_URL}${VOICE_ENDPOINTS.config}`, async ({ request }) => {
        body = await request.json();
        return ok({ stt: { enabled: true }, tts: { enabled: false } });
      }),
    );
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useVoiceConfig(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ stt: { enabled: true }, tts: { enabled: false } });
    expect(body).toEqual({ token: "voice-token" });
  });

  it("fails quietly so the controls just stay hidden", async () => {
    server.use(http.post(`${API_URL}${VOICE_ENDPOINTS.config}`, () => envelopeError(500, "boom")));
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useVoiceConfig(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("doesn't fetch without a logged-in user", () => {
    localStorage.clear();
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useVoiceConfig(), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("transcribeAudio", () => {
  it("uploads the clip with the token as multipart form data", async () => {
    // request.formData() can't parse jsdom's File under undici, so read the raw body.
    let contentType = "";
    let raw = "";
    server.use(
      http.post(`${API_URL}${VOICE_ENDPOINTS.stt}`, async ({ request }) => {
        contentType = request.headers.get("content-type") ?? "";
        raw = await request.text();
        return ok({ text: "hi there", duration_seconds: 1, latency_ms: 10 });
      }),
    );

    const result = await transcribeAudio(
      new Blob(["abc"], { type: "audio/webm" }),
      "recording.webm",
    );
    expect(result.text).toBe("hi there");
    expect(contentType).toMatch(/^multipart\/form-data/);
    expect(raw).toMatch(/name="token"\r\n\r\nvoice-token/);
    // jsdom's serializer drops the filename; browsers send it.
    expect(raw).toMatch(/name="audio"; filename="[^"]+"\r\nContent-Type: audio\/webm/);
  });

  it("toasts and throws on an error envelope", async () => {
    server.use(
      http.post(`${API_URL}${VOICE_ENDPOINTS.stt}`, () => envelopeError(415, "Unsupported audio format")),
    );
    await expect(transcribeAudio(new Blob(["abc"]), "recording.webm")).rejects.toThrow(
      "Unsupported audio format",
    );
    expect(toast.error).toHaveBeenCalledWith("Unsupported audio format");
  });
});

describe("synthesizeSpeech", () => {
  it("returns the WAV clip and sends the speaker", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${API_URL}${VOICE_ENDPOINTS.tts}`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(new Uint8Array([1, 2, 3, 4]), {
          headers: { "content-type": "audio/wav" },
        });
      }),
    );

    const audio = await synthesizeSpeech({ text: "Hello.", speakerKey: "Ann" });
    expect(audio.size).toBe(4);
    expect(body).toEqual({ token: "voice-token", text: "Hello.", speaker_key: "Ann" });
  });

  it("sends the group chat when given", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${API_URL}${VOICE_ENDPOINTS.tts}`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(new Uint8Array([1]), { headers: { "content-type": "audio/wav" } });
      }),
    );
    await synthesizeSpeech({ text: "Hello.", speakerKey: "Ann", groupId: "g1" });
    expect(body).toMatchObject({ speaker_key: "Ann", group_id: "g1" });
  });

  it("omits a blank speaker", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${API_URL}${VOICE_ENDPOINTS.tts}`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(new Uint8Array([1]), { headers: { "content-type": "audio/wav" } });
      }),
    );
    await synthesizeSpeech({ text: "Hello.", speakerKey: "" });
    expect(body).not.toHaveProperty("speaker_key");
  });

  it("throws the backend message without toasting", async () => {
    server.use(http.post(`${API_URL}${VOICE_ENDPOINTS.tts}`, () => envelopeError(502, "Text to speech failed")));
    await expect(synthesizeSpeech({ text: "Hello." })).rejects.toThrow("Text to speech failed");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("rejects an empty clip", async () => {
    server.use(
      http.post(`${API_URL}${VOICE_ENDPOINTS.tts}`, () =>
        new HttpResponse(new Uint8Array([]), { headers: { "content-type": "audio/wav" } }),
      ),
    );
    await expect(synthesizeSpeech({ text: "Hello." })).rejects.toThrow(/couldn't play/i);
  });
});
