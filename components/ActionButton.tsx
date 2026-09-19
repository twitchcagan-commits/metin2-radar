'use client';

import { useState, type ReactNode } from 'react';

/**
 * İndir / siteye git / Discord butonları.
 *
 * - Basılırken scale 0.97, bırakınca spring easing ile geri.
 * - Pending durumu SPINNER DEĞİL, buton içi ilerleme çizgisi.
 * - Tıklama önce bize kaydedilir (clicks tablosu), sonra hedefe gidilir.
 *   Kayıt başarısız olsa bile kullanıcı hedefe gider — ölçüm kullanıcıyı bekletmez.
 */
export function ActionButton({
  href,
  slug,
  kind,
  variant = 'secondary',
  children,
}: {
  href: string;
  slug: string;
  kind: 'download' | 'website' | 'discord';
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>): Promise<void> {
    if (event.metaKey || event.ctrlKey || event.button !== 0) return;
    event.preventDefault();
    setPending(true);

    try {
      await fetch('/api/click', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, kind }),
        keepalive: true,
      });
    } catch {
      // Ölçüm kaybı kullanıcıyı engellemez.
    } finally {
      window.open(href, '_blank', 'noopener,noreferrer');
      setPending(false);
    }
  }

  const base =
    'group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md px-4 py-2.5 text-sm font-medium transition-[transform,background-color,border-color,color] duration-hover ease-out active:scale-[0.97]';

  const skin =
    variant === 'primary'
      ? 'bg-accent text-[#04121f] hover:brightness-110'
      : 'border border-line bg-surface-2 text-text hover:border-line-strong hover:bg-surface-3';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={handleClick}
      aria-busy={pending}
      className={[base, skin, 'ease-spring'].join(' ')}
    >
      {children}
      {pending && (
        <span
          aria-hidden
          className="rdr-progress absolute bottom-0 left-0 h-0.5 w-full bg-current opacity-60"
        />
      )}
    </a>
  );
}
