import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Skull, UserRound } from 'lucide-react';

import { AnimatedNumber } from '@/components/AnimatedNumber';
import { SectionHeading } from '@/components/Section';
import { getAllOwnerKeys, getOwnerRecord } from '@/lib/data/servers';
import { formatDate } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ owner_key: string }[]> {
  return (await getAllOwnerKeys()).map((owner_key) => ({ owner_key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner_key: string }>;
}): Promise<Metadata> {
  const { owner_key } = await params;
  const owner = await getOwnerRecord(owner_key);
  if (!owner) return { title: tr.error.notFound };

  return {
    title: `${owner.displayName} sicili`,
    description: `${owner.displayName} tarafından açılan sunucular ve ortalama yaşam süreleri.`,
  };
}

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ owner_key: string }>;
}) {
  const { owner_key } = await params;
  const owner = await getOwnerRecord(owner_key);
  if (!owner) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-4 pt-8 sm:px-6 sm:pt-12">
      <header className="rdr-enter flex items-start gap-4" style={{ '--i': 0 } as React.CSSProperties}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2">
          <UserRound className="size-5 text-text-faint" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">{owner.displayName}</h1>
          <p className="mt-1 text-xs text-text-faint">Sunucu sahibi sicili</p>
          {owner.notes && (
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-text-muted">{owner.notes}</p>
          )}
        </div>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <Tile label="Açtığı sunucu" value={owner.servers.length} index={1} />
        <Tile label="Hâlâ açık" value={owner.stillAliveCount} index={2} />
        <Tile
          label="Ort. yaşam"
          value={owner.avgLifespanDays === null ? null : Math.round(owner.avgLifespanDays)}
          suffix={owner.avgLifespanDays === null ? undefined : ` ${tr.metric.dayUnit}`}
          index={3}
        />
      </section>

      <div className="mt-10">
        <SectionHeading
          title="Sunucuları"
          note={
            owner.deadCount > 0
              ? `${owner.deadCount} sunucusu kapandı. Kapanan sunucuların ortalama yaşam süresi yukarıda.`
              : 'Bu sahibin henüz kapanan sunucusu yok.'
          }
        />

        <ul className="grid gap-2">
          {owner.servers.map((server, index) => (
            <li key={server.slug} className="rdr-enter" style={{ '--i': index } as React.CSSProperties}>
              <Link
                href={`/sunucu/${server.slug}`}
                className="group flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-1 px-4 py-3 transition-[transform,border-color] duration-hover ease-out hover:-translate-y-0.5 hover:border-line-strong"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {server.status === 'dead' && (
                    <Skull className="size-3.5 shrink-0 text-text-faint" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{server.name}</span>
                    <span className="mt-0.5 block text-[11px] text-text-faint">
                      {tr.status[server.status]}
                      {server.opensAt ? ` · ${formatDate(server.opensAt)}` : ''}
                      {server.diedAt ? ` → ${formatDate(server.diedAt)}` : ''}
                    </span>
                  </span>
                </span>

                <span className="shrink-0 text-right text-sm">
                  {server.lifespanDays === null ? (
                    <span className="text-text-faint">—</span>
                  ) : (
                    <>
                      <span className="tnum font-semibold">{server.lifespanDays}</span>{' '}
                      <span className="text-xs text-text-faint">{tr.metric.dayUnit}</span>
                    </>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function Tile({
  label,
  value,
  suffix,
  index,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  index: number;
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
          <AnimatedNumber value={value} suffix={suffix} />
        )}
      </p>
    </div>
  );
}
