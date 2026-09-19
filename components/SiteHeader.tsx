import Link from 'next/link';
import { Radar } from 'lucide-react';

import { tr } from '@/lib/i18n/tr';

const LINKS = [
  { href: '/takvim', label: tr.nav.calendar },
  { href: '/mezarlik', label: tr.nav.graveyard },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 text-sm font-semibold transition-colors duration-hover ease-out hover:text-accent"
        >
          <Radar
            className="size-4 text-accent transition-transform duration-hover ease-out group-hover:rotate-45"
            aria-hidden
          />
          {tr.site.name}
        </Link>

        <span className="hidden text-xs text-text-faint sm:inline">{tr.site.tagline}</span>

        <ul className="ml-auto flex items-center gap-1">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-md px-2.5 py-1.5 text-xs text-text-muted transition-[color,background-color] duration-hover ease-out hover:bg-surface-2 hover:text-text"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 text-xs leading-relaxed text-text-faint sm:px-6">
        <p className="font-medium text-text-muted">{tr.site.tagline}</p>
        <p className="mt-2 max-w-lg">{tr.site.description}</p>
        <p className="mt-3">
          {tr.time.timezoneNote} · {tr.ad.note} · {tr.score.note}
        </p>
      </div>
    </footer>
  );
}
