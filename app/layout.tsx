import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';

import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { tr } from '@/lib/i18n/tr';

import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: tr.site.name, template: `%s · ${tr.site.name}` },
  description: tr.site.description,
  applicationName: tr.site.name,
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: tr.site.name,
    title: tr.site.name,
    description: tr.site.description,
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#0a0b0d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={GeistSans.variable}>
      <body className="flex min-h-screen flex-col bg-bg text-text antialiased">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
