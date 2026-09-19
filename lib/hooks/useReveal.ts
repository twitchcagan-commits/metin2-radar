'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll ile belirme. Kütüphane kurmuyoruz — 20 satır yeter.
 * Bir kez tetiklenir, tekrar etmez; görünür olan öğe gözlemden çıkar.
 */
export function useReveal<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Hareket tercihi kapalıysa hiç gizlemeye girmeyiz.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.dataset.reveal = 'shown';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'shown';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return ref;
}
