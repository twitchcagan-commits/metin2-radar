import { ShieldAlert } from 'lucide-react';

import type { FlagKind } from '@/lib/constants';
import { tr } from '@/lib/i18n/tr';

/**
 * Manipülasyon uyarısı. Kırmızı ve dikkat çekici ama TİTREMEZ, YANIP SÖNMEZ.
 * Detay tooltip'i sadece hover/focus'ta yumuşak açılır.
 *
 * Dokunmatikte hover yok, bu yüzden açıklama aynı zamanda `title` olarak da
 * verilir ve detay sayfasında zaten düz metin hâlinde yazılır — hover'a bağımlı
 * hiçbir bilgi yoktur.
 */
export function FlagBadge({ kind }: { kind: FlagKind }) {
  const label = tr.flag.kinds[kind];
  const explain = tr.flag.explain[kind];

  return (
    <span className="group/flag relative inline-flex">
      <span
        tabIndex={0}
        role="note"
        aria-label={`${label}: ${explain}`}
        title={explain}
        className="inline-flex items-center gap-1 rounded-sm border border-bad/40 bg-bad/10 px-2 py-1 text-[11px] font-medium leading-none text-bad transition-colors duration-hover ease-out hover:border-bad/70"
      >
        <ShieldAlert className="size-3 shrink-0" aria-hidden />
        {label}
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-56 origin-top-left translate-y-1 scale-95 rounded-md border border-line-strong bg-surface-3 p-3 text-xs leading-relaxed text-text-muted opacity-0 shadow-pop transition-[opacity,transform] duration-hover ease-out group-hover/flag:translate-y-0 group-hover/flag:scale-100 group-hover/flag:opacity-100 group-focus-within/flag:translate-y-0 group-focus-within/flag:scale-100 group-focus-within/flag:opacity-100"
      >
        {explain}
      </span>
    </span>
  );
}
