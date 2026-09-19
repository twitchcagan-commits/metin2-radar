import { Activity, Radar, ShieldAlert } from 'lucide-react';

import { tr } from '@/lib/i18n/tr';

/**
 * Faz 0 iskeleti. Gerçek ana sayfa (açılış takvimi + canlı liste) Faz 3'te.
 * Burada tasarım token'larının ve giriş animasyonunun çalıştığını gösteriyoruz.
 */
const pillars = [
  {
    icon: Radar,
    title: 'Ölçülen veri',
    line: 'Discord API, oyun portu ve kendi tıklama verimiz. Sunucunun beyanı değil.',
  },
  {
    icon: ShieldAlert,
    title: 'Manipülasyon sinyalleri',
    line: 'Düz çizgi sayaç, gece/gündüz döngüsü olmayan grafik, basamak sıçraması.',
  },
  {
    icon: Activity,
    title: 'Trend, mutlak sayı değil',
    line: 'Sayaç 50 kat şişirilmiş olsa bile yüzde değişim doğruyu söyler.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="rdr-enter" style={{ '--i': 0 } as React.CSSProperties}>
        <p className="text-sm font-medium text-accent">{tr.site.tagline}</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{tr.site.name}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
          {tr.site.description}
        </p>
      </header>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {pillars.map(({ icon: Icon, title, line }, index) => (
          <article
            key={title}
            className="rdr-enter group rounded-lg border border-line bg-surface-1 p-5 shadow-raise transition-[transform,border-color] duration-hover ease-out hover:-translate-y-0.5 hover:border-line-strong"
            style={{ '--i': index + 1 } as React.CSSProperties}
          >
            <Icon
              className="size-5 text-text-faint transition-[transform,color] duration-hover ease-out group-hover:scale-105 group-hover:text-accent"
              aria-hidden
            />
            <h2 className="mt-4 text-base font-medium">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{line}</p>
          </article>
        ))}
      </section>

      <footer
        className="rdr-enter mt-12 border-t border-line pt-6 text-xs text-text-faint"
        style={{ '--i': 4 } as React.CSSProperties}
      >
        {tr.time.timezoneNote} · {tr.ad.note}
      </footer>
    </main>
  );
}
