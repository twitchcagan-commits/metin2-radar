import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';

import { CalendarRow } from '@/components/CalendarRow';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeading } from '@/components/Section';
import { SERVER_TYPES, type ServerType } from '@/lib/constants';
import { getUpcomingServers } from '@/lib/data/servers';
import { tr } from '@/lib/i18n/tr';

export const revalidate = 300;

export const metadata: Metadata = {
  title: tr.nav.calendar,
  description: 'Yaklaşan Metin2 PVP sunucu açılışları, geri sayımlı ve filtreli.',
};

/**
 * Filtre sunucu tarafında, arama parametresiyle çalışır — JavaScript kapalı
 * olsa da çalışması gerekiyor ve böylece filtrelenmiş liste paylaşılabilir.
 */
function isServerType(value: string | undefined): value is ServerType {
  return value !== undefined && (SERVER_TYPES as readonly string[]).includes(value);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string }>;
}) {
  const { tur } = await searchParams;
  const active = isServerType(tur) ? tur : null;

  const all = await getUpcomingServers(100);
  const servers = active === null ? all : all.filter((s) => s.serverType === active);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-4 pt-8 sm:px-6 sm:pt-12">
      <SectionHeading
        title={tr.nav.calendar}
        note={`${tr.time.timezoneNote} Açılış saatleri sunucu sahibinin duyurusundan alınır.`}
      />

      <div className="-mx-1 mb-6 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1">
        <FilterChip href="/takvim" label="Tümü" active={active === null} />
        {SERVER_TYPES.map((type) => (
          <FilterChip
            key={type}
            href={`/takvim?tur=${type}`}
            label={tr.serverType[type]}
            active={active === type}
          />
        ))}
      </div>

      {servers.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={tr.empty.noCalendar.title}
          line={tr.empty.noCalendar.line}
        />
      ) : (
        <ul className="grid gap-2">
          {servers.map((server, index) => (
            <CalendarRow key={server.slug} server={server} index={index} />
          ))}
        </ul>
      )}
    </main>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'shrink-0 snap-start rounded-md border px-3 py-1.5 text-xs transition-[background-color,border-color,color,transform] duration-hover ease-out active:scale-[0.97]',
        active
          ? 'border-line-strong bg-surface-3 text-text'
          : 'border-line bg-surface-1 text-text-muted hover:border-line-strong hover:text-text',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}
