'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 600;
/** Animasyon bu süre içinde bitmediyse hedef değer doğrudan yazılır. */
const SAFETY_MS = 1200;

/** globals.css'deki --ease-out ile aynı eğri. */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * 0'dan hedefe requestAnimationFrame ile sayar (600ms, ease-out).
 *
 * DOĞRULUK KURALI: başlangıç değeri hedefin KENDİSİdir, 0 değil.
 * Sunucu render'ında, JavaScript kapalıyken ve rAF'ın hiç çalışmadığı
 * durumlarda (arka plandaki sekme, azaltılmış hareket) ekranda gerçek sayı
 * durur. Animasyon ancak gerçekten çalışabildiğinde devreye girer — bir
 * ölçüm sitesinde "0" göstermek, animasyonu kaçırmaktan çok daha kötüdür.
 */
export function useCountUp(target: number, enabled = true): number {
  const [value, setValue] = useState(target);
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
    setValue(0);

    const step = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / DURATION_MS);
      setValue(target * easeOut(progress));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    const safety = setTimeout(() => setValue(target), SAFETY_MS);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      clearTimeout(safety);
    };
  }, [target, enabled]);

  return value;
}
