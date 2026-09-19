import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Download,
  ExternalLink,
  LineChart,
  MessageCircle,
  Server,
  ShieldCheck,
  Skull,
} from 'lucide-react';

import { ActionButton } from '@/components/ActionButton';
import { Countdown } from '@/components/Countdown';
import { EmptyState } from '@/components/EmptyState';
import { FlagBadge } from '@/components/FlagBadge';
import { Reveal, SectionHeading } from '@/components/Section';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { SourceBadge } from '@/components/SourceBadge';
import { StatTile } from '@/components/StatTile';
import { TrendChart } from '@/components/TrendChart';
import { TrendDelta } from '@/components/TrendDelta';
import { getAllServerSlugs, getServerBySlug } from '@/lib/data/servers';
import { formatDate } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

export const revalidate = 300;

/**
 * Bilinen sunucular önceden üretilir: hem daha hızlı, hem metadata akışa
 * girmeyip doğrudan <head> içinde çıkar. Sonradan eklenen sunucular ilk
 * istekte üretilir (dynamicParams varsayılan olarak açık).
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await getAllServerSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const server = await getServerBySlug(slug);
  if (!server) return { title: tr.error.notFound };

  return {
    title: server.name,
    description: `${server.name} — radar skoru, 7 günlük trend ve manipülasyon sinyalleri. Bağımsız ölçüm.`,
  };
}

export default async function ServerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const server = await getServerBySlug(slug);
  if (!server) notFound();

  const hasSeries = server.series.length >= 2;

  /**
   * Yapılandırılmış veri. Skoru `aggregateRating` olarak değil `Dataset`
   * olarak veriyoruz: bu bir kullanıcı oylaması değil, bizim ölçümümüz —
   * yıldız olarak göstermek yanıltıcı olurdu.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${server.name} — ${tr.score.title}`,
    description: `${server.name} sunucusunun bağımsız ölçümle hesaplanan radar skoru, 7 günlük trendi ve manipülasyon sinyalleri.`,
    creator: { '@type': 'Organization', name: tr.site.name },
    variableMeasured: [
      { '@type': 'PropertyValue', name: tr.score.title, value: server.score ?? undefined },
      { '@type': 'PropertyValue', name: tr.metric.trend7d, value: server.trend7dPct ?? undefined },
      { '@type': 'PropertyValue', name: tr.metric.uptime, value: server.uptimePct ?? undefined },
    ],
    temporalCoverage: server.opensAt ? `${server.opensAt.slice(0, 10)}/..` : undefined,
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-4 pt-8 sm:px-6 sm:pt-12">
      <script
        type="application/ld+json"
        // Veri bizim ürettiğimiz sayılardan oluşuyor, kullanıcı girdisi yok.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* --- Başlık --- */}
      <header className="rdr-enter" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2">
            {server.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- dış logolar
              <img src={server.logoUrl} alt="" className="size-full object-cover" />
            ) : (
              <Server className="size-6 text-text-faint" aria-hidden />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold sm:text-2xl">{server.name}</h1>
              {server.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-sm border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">
                  <ShieldCheck className="size-3" aria-hidden />
                  doğrulanmış
                </span>
              )}
              <span className="rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-muted">
                {tr.status[server.status]}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-text-faint">
              {server.serverType ? tr.serverType[server.serverType] : '—'}
              {server.levelRange ? ` · ${server.levelRange}` : ''}
              {server.opensAt ? ` · açılış ${formatDate(server.opensAt)}` : ''}
              {server.lifespanDays !== null
                ? ` · ${server.lifespanDays} ${tr.metric.dayUnit}`
                : ''}
            </p>

            {server.status === 'upcoming' && server.opensAt && (
              <p className="mt-3 flex items-baseline gap-2 text-sm">
                <span className="text-text-faint">Açılışa</span>
                <Countdown opensAt={server.opensAt} className="text-base" />
              </p>
            )}
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-[11px] text-text-faint">{tr.metric.trend7d}</p>
            <TrendDelta pct={server.trend7dPct} size="lg" />
            {server.trendSource && (
              <p className="mt-1 flex justify-end">
                <SourceBadge source={server.trendSource} compact />
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {server.downloadUrl && (
            <ActionButton href={server.downloadUrl} slug={server.slug} kind="download" variant="primary">
              <Download className="size-4" aria-hidden />
              {tr.action.download}
            </ActionButton>
          )}
          {server.websiteUrl && (
            <ActionButton href={server.websiteUrl} slug={server.slug} kind="website">
              <ExternalLink className="size-4" aria-hidden />
              {tr.action.website}
            </ActionButton>
          )}
          {server.discordInvite && (
            <ActionButton href={server.discordInvite} slug={server.slug} kind="discord">
              <MessageCircle className="size-4" aria-hidden />
              {tr.action.discord}
            </ActionButton>
          )}
        </div>
      </header>

      {/* --- Manipülasyon sinyalleri: grafikten ÖNCE, saklamıyoruz --- */}
      <section className="mt-8">
        <SectionHeading title={tr.flag.title} />
        {server.activeFlags.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface-1 px-4 py-3 text-xs text-text-muted">
            {tr.flag.none}
          </p>
        ) : (
          <div className="rounded-lg border border-bad/30 bg-bad/[0.04] p-4">
            <div className="flex flex-wrap gap-2">
              {server.activeFlags.map((kind) => (
                <FlagBadge key={kind} kind={kind} />
              ))}
            </div>
            <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-text-muted">
              {server.activeFlags.map((kind) => (
                <li key={kind}>
                  <span className="font-medium text-text">{tr.flag.kinds[kind]}:</span>{' '}
                  {tr.flag.explain[kind]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* --- Ölçümler --- */}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={tr.metric.discordOnline}
          value={server.discordOnline === null ? null : Math.round(server.discordOnline)}
          source="measured"
          index={0}
        />
        <StatTile
          label={tr.metric.uptime}
          value={server.uptimePct}
          source="measured"
          suffix="%"
          decimals={1}
          index={1}
        />
        <StatTile
          label={tr.metric.siteOnline}
          value={server.declaredOnline === null ? null : Math.round(server.declaredOnline)}
          source="declared"
          index={2}
        />
        <StatTile
          label={tr.metric.peak}
          value={server.peakOnline}
          source="declared"
          index={3}
        />
      </section>

      {/* --- Grafik --- */}
      <Reveal className="mt-8">
        {hasSeries ? (
          <TrendChart points={server.series} />
        ) : (
          <EmptyState
            icon={LineChart}
            title={tr.empty.noData.title}
            line={tr.empty.noData.line}
          />
        )}
      </Reveal>

      {/* --- Skor kırılımı --- */}
      <Reveal className="mt-8">
        <ScoreBreakdown score={server.score} breakdown={server.scoreBreakdown} />
      </Reveal>

      {/* --- Sahibin sicili --- */}
      {server.ownerKey && (
        <Reveal className="mt-8">
          <SectionHeading
            title="Sahibin geçmiş sunucuları"
            note="Aynı sahibin daha önce açtığı sunucular ve kaç gün yaşadıkları. Kısa ömürlü sunucu geçmişi, yeni sunucunun da kısa ömürlü olabileceğinin en güçlü işaretidir."
            action={
              <Link
                href={`/sahipler/${server.ownerKey}`}
                className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors duration-hover ease-out hover:text-text"
              >
                Sicil
              </Link>
            }
          />

          {server.ownerHistory.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface-1 px-4 py-3 text-xs text-text-muted">
              Bu sahibin kayıtlı başka sunucusu yok.
            </p>
          ) : (
            <ul className="grid gap-2">
              {server.ownerHistory.map((past) => (
                <li key={past.slug}>
                  <Link
                    href={`/sunucu/${past.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm transition-[transform,border-color] duration-hover ease-out hover:-translate-y-0.5 hover:border-line-strong"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {past.status === 'dead' && (
                        <Skull className="size-3.5 shrink-0 text-text-faint" aria-hidden />
                      )}
                      <span className="truncate">{past.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-text-faint">
                      {tr.status[past.status]}
                      {past.lifespanDays !== null && (
                        <>
                          {' · '}
                          <span className="tnum">{past.lifespanDays}</span> {tr.metric.dayUnit}
                        </>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      )}
    </main>
  );
}
