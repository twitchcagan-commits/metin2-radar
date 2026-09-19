import { AnimatedNumber } from '@/components/AnimatedNumber';
import { SourceBadge, type Source } from '@/components/SourceBadge';

/**
 * Tek ölçüm kutusu. Kaynak rozeti ZORUNLU parametre — rozet olmadan
 * ekrana sayı basılamaz (veri sunum kuralı).
 */
export function StatTile({
  label,
  value,
  source,
  suffix,
  decimals = 0,
  index = 0,
}: {
  label: string;
  value: number | null;
  source: Source;
  suffix?: string;
  decimals?: number;
  index?: number;
}) {
  return (
    <div
      className="rdr-enter rounded-lg border border-line bg-surface-1 p-3.5"
      style={{ '--i': index } as React.CSSProperties}
    >
      <p className="text-[11px] text-text-faint">{label}</p>
      <p className="mt-1.5 text-lg font-semibold leading-none">
        {value === null ? (
          <span className="text-text-faint">—</span>
        ) : (
          <AnimatedNumber value={value} suffix={suffix} decimals={decimals} />
        )}
      </p>
      <p className="mt-2">
        <SourceBadge source={source} compact />
      </p>
    </div>
  );
}
