import { describe, it, expect, vi, beforeEach } from "vitest";
import { SpeechPlayer } from "@/lib/voice/speechPlayer";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

type Call = {
  text: string;
  speakerKey?: string;
  groupId?: string;
  signal: AbortSignal;
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
};

function abortError() {
  const error = new Error("cancelled");
  error.name = "AbortError";
  return error;
}

function fakeAudio() {
  return {
    src: "",
    muted: false,
    preload: "",
    onended: null as null | (() => void),
    onerror: null as null | (() => void),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    removeAttribute: vi.fn(function (this: { src: string }) {
      this.src = "";
    }),
  };
}

function setup() {
  const calls: Call[] = [];
  const audio = fakeAudio();
  let urlCount = 0;
  const deps = {
    synthesize: vi.fn(
      ({
        text,
        speakerKey,
        groupId,
        signal,
      }: {
        text: string;
        speakerKey?: string;
        groupId?: string;
        signal: AbortSignal;
      }) =>
        new Promise<Blob>((resolve, reject) => {
          calls.push({ text, speakerKey, groupId, signal, resolve, reject });
          signal.addEventListener("abort", () => reject(abortError()));
        }),
    ),
    createAudio: vi.fn(() => audio as unknown as HTMLAudioElement),
    createObjectURL: vi.fn(() => `blob:${++urlCount}`),
    revokeObjectURL: vi.fn(),
    onError: vi.fn(),
  };
  const player = new SpeechPlayer(deps);
  return { player, deps, calls, audio };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const blob = (label: string) => new Blob([label], { type: "audio/wav" });

describe("SpeechPlayer", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it("reads queued items one after another and cleans up object URLs", async () => {
    const { player, calls, audio, deps } = ctx;
    const listener = vi.fn();
    player.subscribe(listener);

    player.enqueue({ id: "m1", text: "First.", speakerKey: "Ann" });
    player.enqueue({ id: "m2", text: "Second.", speakerKey: "Bob" });
    expect(player.statusOf("m1")).toBe("loading");
    expect(player.statusOf("m2")).toBe("idle");
    expect(calls.map((c) => [c.text, c.speakerKey])).toEqual([
      ["First.", "Ann"],
      ["Second.", "Bob"],
    ]);

    calls[0].resolve(blob("a"));
    calls[1].resolve(blob("b"));
    await flush();
    expect(player.statusOf("m1")).toBe("playing");
    expect(audio.src).toBe("blob:1");
    expect(audio.play).toHaveBeenCalledTimes(1);

    audio.onended?.();
    await flush();
    expect(deps.revokeObjectURL).toHaveBeenCalledWith("blob:1");
    expect(player.statusOf("m2")).toBe("playing");

    audio.onended?.();
    await flush();
    expect(player.statusOf("m2")).toBe("idle");
    expect(deps.revokeObjectURL).toHaveBeenCalledWith("blob:2");
    expect(listener).toHaveBeenCalled();
  });

  it("ignores blank text and duplicate ids", () => {
    const { player, calls } = ctx;
    player.enqueue({ id: "m1", text: "   " });
    player.enqueue({ id: "m2", text: "Hi." });
    player.enqueue({ id: "m2", text: "Hi." });
    player.prefetch({ text: "  " });
    expect(calls).toHaveLength(1);
  });

  it("toggle stops the message that is playing", async () => {
    const { player, calls, audio } = ctx;
    player.toggle({ id: "m1", text: "Hello." });
    calls[0].resolve(blob("a"));
    await flush();
    expect(player.statusOf("m1")).toBe("playing");

    player.toggle({ id: "m1", text: "Hello." });
    expect(player.statusOf("m1")).toBe("idle");
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.removeAttribute).toHaveBeenCalledWith("src");
  });

  it("toggle on another message replaces the queue", async () => {
    const { player, calls } = ctx;
    player.enqueue({ id: "m1", text: "One." });
    player.enqueue({ id: "m2", text: "Two." });
    player.toggle({ id: "m3", text: "Three." });

    expect(calls[0].signal.aborted).toBe(true);
    expect(calls[1].signal.aborted).toBe(true);
    expect(player.statusOf("m3")).toBe("loading");
  });

  it("stop cancels in-flight requests without reporting an error", async () => {
    const { player, calls, deps } = ctx;
    player.enqueue({ id: "m1", text: "One." });
    player.stop();
    await flush();
    expect(calls[0].signal.aborted).toBe(true);
    expect(deps.onError).not.toHaveBeenCalled();
    expect(player.statusOf("m1")).toBe("idle");
  });

  it("replays a message from cache without synthesizing again", async () => {
    const { player, calls, audio, deps } = ctx;
    player.toggle({ id: "m1", text: "Hello.", speakerKey: "Ann" });
    calls[0].resolve(blob("a"));
    await flush();
    audio.onended?.();
    await flush();

    player.toggle({ id: "m1", text: "Hello.", speakerKey: "Ann" });
    await flush();
    expect(deps.synthesize).toHaveBeenCalledTimes(1);
    expect(player.statusOf("m1")).toBe("playing");
  });

  it("shares one request between a prefetch and the later play", async () => {
    const { player, calls, deps } = ctx;
    player.prefetch({ text: "Hello.", speakerKey: "Ann" });
    player.enqueue({ id: "m1", text: "Hello.", speakerKey: "Ann" });
    expect(deps.synthesize).toHaveBeenCalledTimes(1);
    calls[0].resolve(blob("a"));
    await flush();
    expect(player.statusOf("m1")).toBe("playing");
  });

  it("passes the group to synthesis and caches per group", async () => {
    const { player, calls, deps } = ctx;
    player.prefetch({ text: "Hello.", speakerKey: "Ann", groupId: "g1" });
    calls[0].resolve(blob("a"));
    await flush();
    expect(calls[0].groupId).toBe("g1");

    // Same speaker and text in another group (or none) can have another voice.
    player.prefetch({ text: "Hello.", speakerKey: "Ann", groupId: "g2" });
    player.prefetch({ text: "Hello.", speakerKey: "Ann" });
    player.prefetch({ text: "Hello.", speakerKey: "Ann", groupId: "g1" });
    expect(deps.synthesize).toHaveBeenCalledTimes(3);
    expect(calls.map((c) => c.groupId)).toEqual(["g1", "g2", undefined]);
  });

  it("fetches at most two clips at once", async () => {
    const { player, calls } = ctx;
    player.prefetch({ text: "One." });
    player.prefetch({ text: "Two." });
    player.prefetch({ text: "Three." });
    await flush();
    expect(calls).toHaveLength(2);

    calls[0].resolve(blob("1"));
    await flush();
    expect(calls).toHaveLength(3);
    expect(calls[2].text).toBe("Three.");
  });

  it("keeps only the most recent clips cached", async () => {
    const { player, calls, deps } = ctx;
    for (let i = 0; i < 21; i += 1) {
      player.prefetch({ text: `Clip ${i}.` });
      await flush();
      calls[i].resolve(blob(String(i)));
      await flush();
    }
    player.prefetch({ text: "Clip 20." });
    expect(deps.synthesize).toHaveBeenCalledTimes(21);
    player.prefetch({ text: "Clip 0." });
    await flush();
    expect(deps.synthesize).toHaveBeenCalledTimes(22);
  });

  it("reports a synthesis failure and moves on to the next reply", async () => {
    const { player, calls, deps } = ctx;
    player.enqueue({ id: "m1", text: "One." });
    player.enqueue({ id: "m2", text: "Two." });
    calls[0].reject(new Error("Text to speech is unavailable right now"));
    calls[1].resolve(blob("b"));
    await flush();

    expect(deps.onError).toHaveBeenCalledWith("Text to speech is unavailable right now");
    expect(player.statusOf("m2")).toBe("playing");
  });

  it("reports an audio element error and moves on", async () => {
    const { player, calls, audio, deps } = ctx;
    player.enqueue({ id: "m1", text: "One." });
    player.enqueue({ id: "m2", text: "Two." });
    calls[0].resolve(blob("a"));
    calls[1].resolve(blob("b"));
    await flush();

    audio.onerror?.();
    await flush();
    expect(deps.onError).toHaveBeenCalledWith("Couldn't play the reply aloud.");
    expect(player.statusOf("m2")).toBe("playing");
  });

  it("stops and notifies when the browser blocks autoplay", async () => {
    const { player, calls, audio, deps } = ctx;
    const blocked = vi.fn();
    const unsubscribe = player.onAutoplayBlocked(blocked);
    const denied = new Error("denied");
    denied.name = "NotAllowedError";
    audio.play.mockRejectedValueOnce(denied);

    player.enqueue({ id: "m1", text: "One." });
    player.enqueue({ id: "m2", text: "Two." });
    calls[0].resolve(blob("a"));
    await flush();

    expect(deps.onError).toHaveBeenCalledWith(expect.stringMatching(/blocked audio playback/i));
    expect(blocked).toHaveBeenCalledTimes(1);
    expect(player.statusOf("m1")).toBe("idle");
    expect(player.statusOf("m2")).toBe("idle");
    unsubscribe();
  });

  it("reports other play() failures", async () => {
    const { player, calls, audio, deps } = ctx;
    audio.play.mockRejectedValueOnce(new Error("decode"));
    player.enqueue({ id: "m1", text: "One." });
    calls[0].resolve(blob("a"));
    await flush();
    expect(deps.onError).toHaveBeenCalledWith("Couldn't play the reply aloud.");
    expect(player.statusOf("m1")).toBe("idle");
  });

  it("stays quiet when play() is interrupted by a newer source", async () => {
    const { player, calls, audio, deps } = ctx;
    const interrupted = new Error("interrupted");
    interrupted.name = "AbortError";
    audio.play.mockRejectedValueOnce(interrupted);
    player.enqueue({ id: "m1", text: "One." });
    calls[0].resolve(blob("a"));
    await flush();
    expect(deps.onError).not.toHaveBeenCalled();
  });

  it("prime plays a muted clip and pauses it when idle", async () => {
    const { player, audio } = ctx;
    player.prime();
    expect(audio.muted).toBe(true);
    expect(audio.src).toMatch(/^data:audio\/wav/);
    await flush();
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.muted).toBe(false);
  });

  it("prime does nothing while a reply is being read", () => {
    const { player, audio } = ctx;
    player.enqueue({ id: "m1", text: "One." });
    player.prime();
    expect(audio.play).not.toHaveBeenCalled();
  });

  it("prime tolerates a rejected or synchronous play()", async () => {
    const { player, audio } = ctx;
    audio.play.mockRejectedValueOnce(new Error("no"));
    player.prime();
    await flush();
    expect(audio.muted).toBe(false);

    audio.play.mockImplementationOnce(() => undefined as unknown as Promise<void>);
    player.prime();
    expect(audio.muted).toBe(false);

    audio.play.mockImplementationOnce(() => {
      throw new Error("sync");
    });
    player.prime();
    expect(audio.muted).toBe(false);
  });
});
