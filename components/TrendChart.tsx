'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import { SourceBadge } from '@/components/SourceBadge';
import { formatDate, formatNumber } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

/**
 * Sunucu detay grafiği.
 *
 * recharts kullanıyoruz ama VARSAYILAN GÖRÜNÜMÜYLE DEĞİL:
 *  - çizgi soldan sağa çizilerek belirir (strokeDasharray + strokeDashoffset, 1200ms)
 *  - alan dolgusu opacity ile arkadan gelir
 *  - tooltip tamamen kendi bileşenimiz: ince çizgi imleci + yumuşak arka plan
 *  - recharts'ın kendi animasyonu kapalı, legend ve varsayılan grid stili yok
 */

export type ChartPoint = {
  day: string;
  declared: number | null;
  discord: number | null;
};

const RANGES = [
  { days: 7, label: '7g' },
  { days: 30, label: '30g' },
  { days: 90, label: '90g' },
] as const;

/**
 * Çizim animasyonu gerçek yol uzunluğuna bağlanır: SVG path'in uzunluğunu
 * ölçüp --draw-length'e yazarız. Sabit bir tahmin kullanılsa çizgi ya geç
 * belirir ya da kesik görünür.
 */
function useDrawLength(dataKey: string): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    // recharts path'i ilk boyamadan sonra oluşur; bir frame bekliyoruz.
    const raf = requestAnimationFrame(() => {
      const path = host.querySelector<SVGPathElement>(
        '.rdr-line-main .recharts-area-curve',
      );
      if (!path) return;
      host.style.setProperty('--draw-length', `${Math.ceil(path.getTotalLength())}`);
    });

    return () => cancelAnimationFrame(raf);
  }, [dataKey]);

  return ref;
}

// recharts tooltip prop'larını kendisi enjekte eder; JSX'te hepsini elle
// vermediğimiz için Partial alıyoruz.
function ChartTooltip({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload || payload.length === 0) return null;

  const declared = payload.find((p) => p.dataKey === 'declared')?.value;
  const discord = payload.find((p) => p.dataKey === 'discord')?.value;

  return (
    <div className="pointer-events-none rounded-md border border-line-strong bg-surface-3/95 px-3 py-2 text-xs shadow-pop">
      <p className="font-medium text-text">{formatDate(String(label))}</p>

      {typeof discord === 'number' && (
        <p className="mt-1.5 flex items-center justify-between gap-3">
          <span className="text-text-muted">{tr.metric.discordOnline}</span>
          <span className="tnum font-medium" style={{ color: 'var(--color-accent)' }}>
            {formatNumber(Math.round(discord))}
          </span>
        </p>
      )}

      {typeof declared === 'number' && (
        <p className="mt-1 flex items-center justify-between gap-3">
          <span className="text-text-muted">{tr.metric.siteOnline}</span>
          <span className="tnum font-medium text-text-muted">
            {formatNumber(Math.round(declared))}
          </span>
        </p>
      )}
    </div>
  );
}

export function TrendChart({ points }: { points: readonly ChartPoint[] }) {
  const [days, setDays] = useState<number>(30);

  const data = useMemo(() => points.slice(-days), [points, days]);

  // Aralık değişince path yeniden ölçülür.
  const hostRef = useDrawLength(`${days}:${data.length}`);

  const hasDeclared = data.some((p) => p.declared !== null);
  const hasDiscord = data.some((p) => p.discord !== null);

  return (
    <section className="rounded-lg border border-line bg-surface-1 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">{tr.metric.trend30d}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-faint">
            <SourceBadge source="measured" compact />
            <span>Discord</span>
            <span aria-hidden>·</span>
            <SourceBadge source="declared" compact />
            <span>{tr.metric.siteOnline}</span>
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Zaman aralığı"
          className="flex items-center gap-1 rounded-md border border-line bg-surface-2 p-1"
        >
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              role="tab"
              aria-selected={days === range.days}
              onClick={() => setDays(range.days)}
              className={[
                'tnum rounded-sm px-2.5 py-1 text-xs transition-[background-color,color,transform] duration-hover ease-out active:scale-[0.97]',
                days === range.days
                  ? 'bg-surface-3 text-text'
                  : 'text-text-faint hover:text-text-muted',
              ].join(' ')}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>

      {/* Sabit yükseklik: iskeletle aynı, içerik gelince sayfa zıplamaz. */}
      <div ref={hostRef} className="rdr-chart-draw mt-4 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[...data]} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="rdr-discord-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="var(--color-line)"
              strokeDasharray="2 6"
              vertical={false}
            />

            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickFormatter={(value: string) => value.slice(5).replace('-', '.')}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value: number) => formatNumber(value)}
            />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'var(--color-line-strong)', strokeWidth: 1 }}
            />

            {hasDeclared && (
              <Area
                type="monotone"
                dataKey="declared"
                stroke="var(--color-text-faint)"
                strokeWidth={1.25}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {hasDiscord && (
              <Area
                type="monotone"
                dataKey="discord"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#rdr-discord-fill)"
                dot={false}
                isAnimationActive={false}
                connectNulls
                className="rdr-line-main"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
