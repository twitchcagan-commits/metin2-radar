import type { Metadata } from 'next';
import Link from 'next/link';
import { Skull } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { SectionHeading } from '@/components/Section';
import { SourceBadge } from '@/components/SourceBadge';
import { getDeadServers } from '@/lib/data/servers';
import { formatDate, formatNumber } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: tr.nav.graveyard,
  description:
    'Kapanmış Metin2 PVP sunucuları: kaç gün yaşadılar, zirve ve son online sayıları.',
};

export default async function GraveyardPage() {
  const servers = await getDeadServers(100);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-4 pt-8 sm:px-6 sm:pt-12">
      <SectionHeading
        title={tr.nav.graveyard}
        note="Kapanmış sunucular. Bir sunucunun kaç gün yaşadığı, aynı sahibin yeni sunucusu için en iyi tahmindir."
      />

      {servers.length === 0 ? (
        <EmptyState
          icon={Skull}
          title={tr.empty.noGraveyard.title}
          line={tr.empty.noGraveyard.line}
        />
      ) : (
        <ul className="grid gap-2">
          {servers.map((server, index) => (
            <li key={server.slug} className="rdr-enter" style={{ '--i': index } as React.CSSProperties}>
              <Link
                href={`/sunucu/${server.slug}`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-line bg-surface-1 px-4 py-3 transition-[transform,border-color,background-color] duration-hover ease-out hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-2"
              >
                <Skull
                  className="size-4 shrink-0 text-text-faint transition-colors duration-hover ease-out group-hover:text-text-muted"
                  aria-hidden
                />

                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{server.name}</span>
                  <span className="mt-0.5 block text-[11px] text-text-faint">
                    {server.serverType ? tr.serverType[server.serverType] : '—'}
                    {server.opensAt ? ` · ${formatDate(server.opensAt)}` : ''}
                    {server.diedAt ? ` → ${formatDate(server.diedAt)}` : ''}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold">
                    {server.lifespanDays === null ? (
                      '—'
                    ) : (
                      <>
                        <span className="tnum">{server.lifespanDays}</span>{' '}
                        <span className="text-xs font-normal text-text-faint">
                          {tr.metric.dayUnit}
                        </span>
                      </>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center justify-end gap-1.5 text-[11px] text-text-faint">
                    {server.peakOnline !== null && (
                      <>
                        <span>
                          {tr.metric.peak} <span className="tnum">{formatNumber(server.peakOnline)}</span>
                        </span>
                        <SourceBadge source="declared" compact />
                      </>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
