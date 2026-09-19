import Link from 'next/link';
import { CalendarClock } from 'lucide-react';

import { AdSlot, type Ad } from '@/components/AdSlot';
import { CalendarRow } from '@/components/CalendarRow';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeading } from '@/components/Section';
import { SERVER_TYPES, type ServerType } from '@/lib/constants';
import type { ServerSummary } from '@/lib/data/servers';
import { tr } from '@/lib/i18n/tr';

/**
 * Takvim gövdesi. Hem /takvim hem /takvim/[tur] bunu kullanır.
 *
 * Filtre bir arama parametresi değil, gerçek bir adres segmenti: böylece her
 * filtre statik olarak üretilebiliyor, JavaScript kapalıyken de çalışıyor ve
 * paylaşılabilir bir adresi oluyor.
 */
export function CalendarView({
  servers,
  ads,
  active,
}: {
  servers: readonly ServerSummary[];
  ads: readonly Ad[];
  active: ServerType | null;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-4 pt-8 sm:px-6 sm:pt-12">
      <SectionHeading
        title={active === null ? tr.nav.calendar : `${tr.serverType[active]} açılışları`}
        note={`${tr.time.timezoneNote} Açılış saatleri sunucu sahibinin duyurusundan alınır.`}
      />

      <nav
        aria-label="Sunucu türü filtresi"
        className="-mx-1 mb-6 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1"
      >
        <FilterChip href="/takvim" label="Tümü" active={active === null} />
        {SERVER_TYPES.map((type) => (
          <FilterChip
            key={type}
            href={`/takvim/${type}`}
            label={tr.serverType[type]}
            active={active === type}
          />
        ))}
      </nav>

      {ads.length > 0 && <AdSlot ads={ads} className="mb-6" />}

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
