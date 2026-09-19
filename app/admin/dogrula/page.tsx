import type { Metadata } from 'next';

import { VerifyClient } from '@/app/admin/dogrula/VerifyClient';

export const metadata: Metadata = { title: 'Doğrulanıyor', robots: { index: false } };

/**
 * Magic link dönüş sayfası. Supabase oturum bilgisini URL parçasında (#)
 * gönderir; parça sunucuya ulaşmaz, bu yüzden değişimi tarayıcıda yapıp
 * çereze yazıyoruz.
 */
export default function VerifyPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-lg font-semibold">Giriş doğrulanıyor</h1>
      <VerifyClient />
    </main>
  );
}
