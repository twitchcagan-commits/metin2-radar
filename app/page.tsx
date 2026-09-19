import Link from 'next/link';
import { CalendarClock, Activity, ArrowRight } from 'lucide-react';

import { AdSlot } from '@/components/AdSlot';
import { CalendarRow } from '@/components/CalendarRow';
import { EmptyState } from '@/components/EmptyState';
import { Reveal, SectionHeading } from '@/components/Section';
import { ServerCard } from '@/components/ServerCard';
import { getAds } from '@/lib/data/ads';
import { getLiveServers, getUpcomingServers, type ServerSummary } from '@/lib/data/servers';
import { tr } from '@/lib/i18n/tr';

/**
 * Ana sayfa: üstte açılış takvimi (geri sayımlı), altında skora göre
 * "gerçekten canlı olanlar". Reklam blokları AYRI ve etiketli — sıralamanın
 * içine karışmaz.
 */

export const revalidate = 300;

const DAY_MS = 86_400_000;

function splitByWindow(servers: readonly ServerSummary[]): {
  today: ServerSummary[];
  thisWeek: ServerSummary[];
  later: ServerSummary[];
} {
  const now = Date.now();
  const endOfToday = now + DAY_MS;
  const endOfWeek = now + 7 * DAY_MS;

  const today: ServerSummary[] = [];
  const thisWeek: ServerSummary[] = [];
  const later: ServerSummary[] = [];

  for (const server of servers) {
    if (!server.opensAt) continue;
    const at = new Date(server.opensAt).getTime();
    if (at <= endOfToday) today.push(server);
    else if (at <= endOfWeek) thisWeek.push(server);
    else later.push(server);
  }

  return { today, thisWeek, later };
}

function CalendarGroup({
  title,
  servers,
  offset,
}: {
  title: string;
  servers: readonly ServerSummary[];
  offset: number;
}) {
  if (servers.length === 0) return null;

  return (
    <div className="mt-5 first:mt-0">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-faint">
        {title}
      </h3>
      <ul className="grid gap-2">
        {servers.map((server, index) => (
          <CalendarRow key={server.slug} server={server} index={offset + index} />
        ))}
      </ul>
    </div>
  );
}

export default async function HomePage() {
  const [upcoming, live, topAds, blockAds] = await Promise.all([
    getUpcomingServers(12),
    getLiveServers(12),
    getAds('top', 2),
    getAds('homepage_block', 2),
  ]);

  const { today, thisWeek, later } = splitByWindow(upcoming);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-4 pt-8 sm:px-6 sm:pt-12">
      <section className="rdr-enter" style={{ '--i': 0 } as React.CSSProperties}>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Bu sunucu yaşıyor mu, ne kadar dayanır?
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-text-muted">
          Sunucuların kendi online sayaçları şişirilebilir — biz mutlak sayıyı değil{' '}
          <strong className="font-medium text-text">yüzde trendi</strong> ve{' '}
          <strong className="font-medium text-text">manipülasyon sinyallerini</strong> ölçüyoruz.
          Sıralama satılmaz.
        </p>
      </section>

      {topAds.length > 0 && <AdSlot ads={topAds} className="mt-6" />}

      {/* --- Açılış takvimi --- */}
      <Reveal className="mt-10">
        <SectionHeading
          title="Açılış takvimi"
          note={tr.time.timezoneNote}
          action={
            <Link
              href="/takvim"
              className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-muted transition-colors duration-hover ease-out hover:text-text"
            >
              {tr.nav.calendar}
              <ArrowRight
                className="size-3.5 transition-transform duration-hover ease-out group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          }
        />

        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={tr.empty.noCalendar.title}
            line={tr.empty.noCalendar.line}
          />
        ) : (
          <>
            <CalendarGroup title="Bugün" servers={today} offset={0} />
            <CalendarGroup title="Bu hafta" servers={thisWeek} offset={today.length} />
            <CalendarGroup
              title="Daha sonra"
              servers={later}
              offset={today.length + thisWeek.length}
            />
          </>
        )}
      </Reveal>

      {/* --- Gerçekten canlı olanlar --- */}
      <Reveal className="mt-12">
        <SectionHeading
          title="Gerçekten canlı olanlar"
          note="Radar skoruna göre sıralı. Skor ölçülen veriden gelir: trend, tıklama, Discord, erişilebilirlik, yaşam süresi. Sunucunun beyan ettiği sayı skora girmez."
        />

        {live.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={tr.empty.noServers.title}
            line={tr.empty.noServers.line}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {live.map((server, index) => (
              <ServerCard key={server.slug} server={server} index={index} />
            ))}
          </div>
        )}
      </Reveal>

      {blockAds.length > 0 && <AdSlot ads={blockAds} className="mt-12" />}
    </main>
  );
}
