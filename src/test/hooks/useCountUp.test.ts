import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountUp } from "../../hooks/useCountUp";

// rAF and performance.now must be faked together, otherwise the eased progress
// (which divides by performance.now) never advances while timers are frozen.
const FAKE = {
  toFake: [
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "performance",
    "Date",
    "setTimeout",
    "clearTimeout",
  ] as const,
};

describe("useCountUp", () => {
  beforeEach(() => vi.useFakeTimers(FAKE as never));
  afterEach(() => vi.useRealTimers());

  it("starts at 0", () => {
    const { result } = renderHook(() => useCountUp(100, 700));
    expect(result.current).toBe(0);
  });

  it("reaches the target after the full duration", () => {
    const { result } = renderHook(() => useCountUp(100, 700));
    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toBe(100);
  });

  it("produces an intermediate value mid-animation", () => {
    const { result } = renderHook(() => useCountUp(100, 700));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
  });

  it("stays at 0 when the target is 0 (no animation)", () => {
    const { result } = renderHook(() => useCountUp(0, 700));
    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toBe(0);
  });

  it("animates from the previous value toward a new target", () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, 700), {
      initialProps: { t: 100 },
    });
    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toBe(100);

    rerender({ t: 200 });
    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toBe(200);
  });
});
