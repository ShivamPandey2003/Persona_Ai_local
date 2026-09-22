import { useQuery } from "@tanstack/react-query";
import { getAuthToken, postApi } from "@/lib/api";
import { apiRequest } from "@/services/apiService";
import { VOICE_ENDPOINTS } from "./endpoints";

/** Only what the UI needs; provider details stay on the backend. */
export type VoiceConfig = {
  stt: { enabled: boolean };
  tts: { enabled: boolean };
  /** Longest clip the backend transcribes (VOICE_MAX_RECORDING_SECONDS). */
  limits?: { max_recording_seconds?: number };
};

export type TranscriptionResult = {
  text: string;
  duration_seconds: number | null;
  latency_ms: number;
};

export const voiceConfigKey = ["VoiceConfig"] as const;

/**
 * Voice config (VOICE_ENDPOINTS.config) — whether speech-to-text / text-to-speech are available.
 * Failing quietly just hides the voice controls, so no toast.
 */
export const useVoiceConfig = () => {
  const token = getAuthToken();
  return useQuery({
    queryKey: voiceConfigKey,
    queryFn: () => postApi<VoiceConfig>(VOICE_ENDPOINTS.config, { token }, { silent: true }),
    enabled: Boolean(token),
    staleTime: Infinity,
    retry: false,
  });
};

/** Speech to text (VOICE_ENDPOINTS.stt) — transcribe one recorded clip. Errors are toasted. */
export function transcribeAudio(
  audio: Blob,
  filename: string,
  signal?: AbortSignal,
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("token", getAuthToken());
  form.append("audio", audio, filename);
  return postApi<TranscriptionResult>(
    VOICE_ENDPOINTS.stt,
    form as unknown as Record<string, unknown>,
    { signal, timeoutMs: 60_000 },
  );
}

/**
 * Text to speech (VOICE_ENDPOINTS.tts) — a complete WAV for `text`. `speakerKey` (the persona name)
 * keeps each persona on one voice. Silent: callers decide how to report failures.
 */
export async function synthesizeSpeech({
  text,
  speakerKey,
  groupId,
  signal,
}: {
  text: string;
  speakerKey?: string;
  /** Group chat the speaker is in: lets the backend use the persona's stored voice. */
  groupId?: string;
  signal?: AbortSignal;
}): Promise<Blob> {
  const res = await apiRequest(
    "post",
    VOICE_ENDPOINTS.tts,
    {
      token: getAuthToken(),
      text,
      speaker_key: speakerKey || undefined,
      group_id: groupId || undefined,
    },
    "blob",
    { signal, timeoutMs: 90_000, silent: true },
  );
  const audio = res?.response;
  if (!(audio instanceof Blob) || audio.size === 0) {
    throw new Error("Couldn't play this reply aloud.");
  }
  return audio;
}
