'use client';

import { useCountUp } from '@/lib/hooks/useCountUp';
import { formatNumber } from '@/lib/format';

/**
 * Sayı 0'dan hedefe animasyonla sayar (600ms, ease-out).
 * tabular-nums açık — rakam genişliği sabit, sayaç zıplamaz.
 */
export function AnimatedNumber({
  value,
  suffix,
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const current = useCountUp(value);
  const shown =
    decimals > 0
      ? current.toLocaleString('tr-TR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : formatNumber(Math.round(current));

  return (
    <span className={['tnum', className].filter(Boolean).join(' ')}>
      {shown}
      {suffix}
    </span>
  );
}
