import type { Metadata } from 'next';
import Link from 'next/link';

import { currentAdmin } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Yönetim',
  robots: { index: false, follow: false },
};

/**
 * Panel kapısı. Giriş ve doğrulama sayfaları bu düzenin dışında tutulamıyor
 * (aynı segment altında), bu yüzden kendileri kapıyı atlar — ikisi de
 * currentAdmin() çağırıp kendi kararını verir.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {admin ? (
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h1 className="text-lg font-semibold">Yönetim</h1>
            <p className="mt-0.5 text-xs text-text-faint">{admin.email}</p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-xs transition-colors duration-hover ease-out hover:border-line-strong"
          >
            Siteye dön
          </Link>
        </header>
      ) : null}

      {children}
    </div>
  );
}
