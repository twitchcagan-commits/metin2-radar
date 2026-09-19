import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { formatPercent } from '@/lib/format';

/**
 * ANA METRİK. Mutlak online sayısı değil, yüzde trend.
 * Sayaç 50 kat şişirilmiş olsa bile yüzde değişim doğruyu söyler.
 */
export function TrendDelta({
  pct,
  size = 'md',
}: {
  pct: number | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1 text-text-faint">
        <Minus className="size-3.5" aria-hidden />
        <span className="tnum">—</span>
      </span>
    );
  }

  const rising = pct > 0.5;
  const falling = pct < -0.5;
  const Icon = rising ? TrendingUp : falling ? TrendingDown : Minus;

  const tone = rising ? 'text-good' : falling ? 'text-bad' : 'text-text-muted';
  const textSize =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'lg' ? 'size-5' : 'size-3.5';

  return (
    <span className={['inline-flex items-center gap-1.5 font-medium', tone, textSize].join(' ')}>
      <Icon className={`${iconSize} shrink-0`} aria-hidden />
      <span className="tnum">{formatPercent(pct)}</span>
    </span>
  );
}
