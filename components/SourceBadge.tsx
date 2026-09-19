import { BadgeCheck, TriangleAlert } from 'lucide-react';

import { tr } from '@/lib/i18n/tr';

/**
 * VERİ SUNUM KURALI — bu bileşen olmadan hiçbir sayı ekrana çıkmaz.
 *
 * declared: sunucunun kendi sayacı → doğrulanmadı
 * measured: Discord / oyun portu / kendi tıklama verimiz → bağımsız ölçüm
 */
export type Source = 'declared' | 'measured';

export function SourceBadge({
  source,
  compact = false,
}: {
  source: Source;
  compact?: boolean;
}) {
  const declared = source === 'declared';
  const Icon = declared ? TriangleAlert : BadgeCheck;

  const label = declared
    ? compact
      ? tr.source.declaredShort
      : tr.source.declared
    : compact
      ? tr.source.measuredShort
      : tr.source.measured;

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-[11px] leading-none',
        declared ? 'text-warn' : 'text-good',
      ].join(' ')}
      title={declared ? tr.source.explainDeclared : tr.source.explainMeasured}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
