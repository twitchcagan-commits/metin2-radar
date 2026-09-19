'use client';

import type { ReactNode } from 'react';

import { useReveal } from '@/lib/hooks/useReveal';

/**
 * Scroll ile beliren bölüm sarmalayıcı. Bir kez tetiklenir.
 * Aynı anda ekranda 3'ten fazla hareket olmasın diye bölüm bazında çalışır,
 * içindeki her kart için ayrı gözlemci kurulmaz.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div ref={ref} data-reveal="hidden" className={className}>
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {note && <p className="mt-1 text-xs leading-relaxed text-text-muted">{note}</p>}
      </div>
      {action}
    </div>
  );
}
