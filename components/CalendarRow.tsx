import Link from 'next/link';
import { ArrowRight, CalendarClock, Server } from 'lucide-react';

import { Countdown } from '@/components/Countdown';
import type { ServerSummary } from '@/lib/data/servers';
import { formatDateTime } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

/**
 * Açılış takvimi satırı. Geri sayım burada yaşar.
 * Kartlarla aynı iki katmanlı hover: satır aydınlanır + ok sağa kayar.
 */
export function CalendarRow({
  server,
  index = 0,
}: {
  server: ServerSummary;
  index?: number;
}) {
  return (
    <li className="rdr-enter" style={{ '--i': index } as React.CSSProperties}>
      <Link
        href={`/sunucu/${server.slug}`}
        className="group flex items-center gap-3 rounded-lg border border-line bg-surface-1 px-4 py-3 transition-[transform,border-color,background-color] duration-hover ease-out hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-2"
      >
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-2 transition-transform duration-hover ease-out group-hover:scale-[1.04]">
          {server.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- dış logolar
            <img src={server.logoUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <Server className="size-4 text-text-faint" aria-hidden />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{server.name}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-faint">
            <CalendarClock className="size-3 shrink-0" aria-hidden />
            {server.opensAt ? formatDateTime(server.opensAt) : '—'}
            {server.serverType ? ` · ${tr.serverType[server.serverType]}` : ''}
          </span>
        </span>

        <span className="shrink-0 text-right">
          {server.opensAt && (
            <Countdown opensAt={server.opensAt} className="text-sm text-text" />
          )}
        </span>

        <ArrowRight
          className="size-4 shrink-0 text-text-faint transition-transform duration-hover ease-out group-hover:translate-x-1"
          aria-hidden
        />
      </Link>
    </li>
  );
}
