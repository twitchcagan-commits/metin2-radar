'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 600;

/** globals.css'deki --ease-out ile aynı eğri. */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * 0'dan hedefe requestAnimationFrame ile sayar (600ms, ease-out).
 * Hareket tercihi kapalıysa doğrudan hedefi döner.
 */
export function useCountUp(target: number, enabled = true): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !Number.isFinite(target)) {
      setValue(target);
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    const startedAt = performance.now();
    const from = 0;

    const step = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / DURATION_MS);
      setValue(from + (target - from) * easeOut(progress));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, enabled]);

  return value;
}
