import Link from 'next/link';
import { ArrowRight, Server, ShieldCheck } from 'lucide-react';

import { FlagBadge } from '@/components/FlagBadge';
import { SourceBadge } from '@/components/SourceBadge';
import { Sparkline } from '@/components/Sparkline';
import { TrendDelta } from '@/components/TrendDelta';
import type { ServerSummary } from '@/lib/data/servers';
import { formatNumber } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

/**
 * Hover üç katmanlı ve hepsi aynı 150ms içinde:
 *   1. kart 2px yukarı kalkar
 *   2. kenarlık aydınlanır
 *   3. logo scale 1.04 + sağdaki ok 4px sağa kayar + sparkline belirir
 *
 * Dokunmatikte hover yok: sparkline mobilde de görünür (opacity sınıfı
 * sadece sm ve üstünde gizler), trend yüzdesi ve skor her zaman yazılı.
 * Hover'a bağımlı hiçbir bilgi yoktur.
 */
export function ServerCard({
  server,
  index = 0,
}: {
  server: ServerSummary;
  index?: number;
}) {
  const scoreLabel = server.score === null ? '—' : Math.round(server.score);

  return (
    <Link
      href={`/sunucu/${server.slug}`}
      style={{ '--i': index } as React.CSSProperties}
      className="rdr-enter group block rounded-lg border border-line bg-surface-1 p-4 shadow-raise transition-[transform,border-color,background-color] duration-hover ease-out hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-2"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-2 transition-transform duration-hover ease-out group-hover:scale-[1.04]">
          {server.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- dış logolar, boyutu bilinmiyor
            <img
              src={server.logoUrl}
              alt=""
              width={40}
              height={40}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <Server className="size-4 text-text-faint" aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-medium">{server.name}</h3>
            {server.isVerified && (
              <ShieldCheck className="size-3.5 shrink-0 text-accent" aria-label="doğrulanmış" />
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-text-faint">
            {server.serverType ? tr.serverType[server.serverType] : '—'}
            {server.levelRange ? ` · ${server.levelRange}` : ''}
          </p>
        </div>

        <span className="flex shrink-0 flex-col items-end">
          <span className="tnum text-base font-semibold leading-none">{scoreLabel}</span>
          <span className="mt-1 text-[10px] uppercase tracking-wide text-text-faint">
            {tr.metric.score}
          </span>
        </span>
      </div>

      {server.activeFlags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {server.activeFlags.map((kind) => (
            <FlagBadge key={kind} kind={kind} />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-text-faint">{tr.metric.trend7d}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <TrendDelta pct={server.trend7dPct} />
            {server.trendSource && <SourceBadge source={server.trendSource} compact />}
          </div>
          {server.declaredOnline !== null && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-faint">
              <span className="tnum">{formatNumber(Math.round(server.declaredOnline))}</span>
              <SourceBadge source="declared" compact />
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="opacity-70 transition-opacity duration-hover ease-out sm:opacity-0 sm:group-hover:opacity-100">
            <Sparkline values={server.sparkline} />
          </span>
          <ArrowRight
            className="size-4 shrink-0 text-text-faint transition-transform duration-hover ease-out group-hover:translate-x-1"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}
