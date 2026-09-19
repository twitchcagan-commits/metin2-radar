/**
 * Kart içi mini grafik. recharts kullanmaz — 14 nokta için bir kütüphane
 * yüklemek anlamsız, düz SVG hem hafif hem tam kontrol.
 *
 * Şekil bilgisi taşır: yönü ve dalgalanmayı gösterir. Eksen ve etiket yoktur,
 * çünkü buradaki iş "trend yukarı mı aşağı mı" sorusunu tek bakışta cevaplamak.
 */
export function Sparkline({
  values,
  width = 88,
  height = 28,
  className,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 2;
  const usable = height - pad * 2;

  const points = values.map((value, index) => {
    const x = index * stepX;
    const y = pad + usable - ((value - min) / span) * usable;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const tone =
    last > first * 1.02
      ? 'var(--color-good)'
      : last < first * 0.98
        ? 'var(--color-bad)'
        : 'var(--color-text-faint)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={tone}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
