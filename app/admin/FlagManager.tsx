'use client';

import { useState } from 'react';

import type { FlagKind } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

export type AdminFlag = {
  id: number;
  kind: FlagKind;
  detectedAt: string;
  serverName: string;
  serverSlug: string;
  details: Record<string, unknown> | null;
};

/**
 * Yanlış pozitif flag'i kapatma.
 *
 * Uyarı metni bilerek duruyor: günlük job sinyali hâlâ görüyorsa flag yeniden
 * açılır. Kalıcı çözüm eşiği değiştirmek, flag'i elle kapatmak değil.
 */
export function FlagManager({ flags }: { flags: readonly AdminFlag[] }) {
  const [closed, setClosed] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);

  async function close(id: number): Promise<void> {
    setBusy(id);
    try {
      const response = await fetch('/api/admin/flags', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, is_active: false }),
      });
      if (response.ok) setClosed((current) => new Set(current).add(id));
    } finally {
      setBusy(null);
    }
  }

  if (flags.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface-1 px-4 py-3 text-xs text-text-muted">
        {tr.flag.none}
      </p>
    );
  }

  return (
    <>
      <p className="mb-3 text-[11px] leading-relaxed text-text-faint">
        Flag&apos;i kapatmak kalıcı değildir: günlük iş sinyali hâlâ görüyorsa yeniden açar.
        Kalıcı düzeltme için tespit eşiği değişmelidir.
      </p>

      <ul className="grid gap-2">
        {flags.map((flag) => {
          const isClosed = closed.has(flag.id);

          return (
            <li
              key={flag.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-1 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{flag.serverName}</span>
                  <span className="text-text-faint"> — {tr.flag.kinds[flag.kind]}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-text-faint">
                  {formatDateTime(flag.detectedAt)}
                  {flag.details ? ` · ${JSON.stringify(flag.details)}` : ''}
                </p>
              </div>

              {isClosed ? (
                <span className="text-xs text-good">kapatıldı</span>
              ) : (
                <button
                  type="button"
                  onClick={() => close(flag.id)}
                  disabled={busy === flag.id}
                  className="relative shrink-0 overflow-hidden rounded-md border border-line bg-surface-2 px-3 py-1.5 text-xs transition-[transform,border-color] duration-hover ease-spring hover:border-line-strong active:scale-[0.97] disabled:opacity-50"
                >
                  Kapat
                  {busy === flag.id && (
                    <span
                      aria-hidden
                      className="rdr-progress absolute bottom-0 left-0 h-0.5 w-full bg-current opacity-60"
                    />
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
