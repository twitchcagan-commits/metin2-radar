import type { Metadata } from 'next';

import { LoginForm } from '@/app/admin/giris/LoginForm';
import { allowlistConfigured, currentAdmin } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Yönetim girişi', robots: { index: false } };

export default async function LoginPage() {
  const admin = await currentAdmin();
  if (admin) redirect('/admin');

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-lg font-semibold">Yönetim girişi</h1>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        E-posta adresine tek kullanımlık giriş bağlantısı gönderilir. Şifre yok.
      </p>

      {!isConfigured() ? (
        <p className="mt-6 rounded-lg border border-warn/30 bg-warn/[0.06] p-3 text-xs leading-relaxed text-text-muted">
          Supabase bağlanmamış. <code className="text-text">.env.local</code> dosyasına
          Supabase adresini ve anon anahtarını ekle, sonra bu sayfayı yenile.
        </p>
      ) : !allowlistConfigured() ? (
        <p className="mt-6 rounded-lg border border-warn/30 bg-warn/[0.06] p-3 text-xs leading-relaxed text-text-muted">
          <code className="text-text">ADMIN_EMAILS</code> tanımlı değil. İzin listesi boşken
          panel kimseye açılmaz — kendi e-postanı ekleyip yeniden başlat.
        </p>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
