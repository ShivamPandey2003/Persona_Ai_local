import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from its previous value up to `target`.
 *
 * Uses requestAnimationFrame and only calls setState inside the rAF callback
 * (never synchronously in the effect body), so it doesn't trigger cascading
 * renders. Counts up from 0 on first mount and from the last value thereafter.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
