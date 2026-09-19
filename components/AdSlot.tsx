import { tr } from '@/lib/i18n/tr';

/**
 * Reklam alanı.
 *
 * REKLAM SIRALAMAYI ETKİLEMEZ. Bu bileşen sıralama listelerinin İÇİNE
 * karıştırılmaz; her zaman ayrı bir blok olarak, "Reklam" etiketiyle durur.
 * Rakiplerden ayrıldığımız tek nokta bu, o yüzden etiket opsiyonel değil.
 */
export type Ad = {
  id: string;
  imageUrl: string | null;
  targetUrl: string | null;
  label: string | null;
};

export function AdSlot({ ads, className }: { ads: readonly Ad[]; className?: string }) {
  if (ads.length === 0) return null;

  return (
    <aside
      className={['rounded-lg border border-line bg-surface-1 p-3', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={tr.ad.label}
    >
      <p className="flex items-center justify-between text-[10px] uppercase tracking-wider text-text-faint">
        <span>{tr.ad.label}</span>
        <span className="normal-case tracking-normal">{tr.ad.note}</span>
      </p>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        {ads.map((ad) => (
          <a
            key={ad.id}
            href={ad.targetUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="group block overflow-hidden rounded-md border border-line bg-surface-2 transition-[transform,border-color] duration-hover ease-out hover:-translate-y-0.5 hover:border-line-strong"
          >
            {ad.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- reklam görselleri dış kaynaklı
              <img
                src={ad.imageUrl}
                alt={ad.label ?? tr.ad.label}
                className="h-20 w-full object-cover transition-transform duration-hover ease-out group-hover:scale-[1.02]"
                loading="lazy"
              />
            ) : (
              <span className="flex h-20 items-center justify-center px-3 text-center text-xs text-text-muted">
                {ad.label ?? tr.ad.label}
              </span>
            )}
          </a>
        ))}
      </div>
    </aside>
  );
}
