'use client';

import { useEffect, useState } from 'react';

import { browserClient } from '@/lib/supabase/browser';

export function VerifyClient() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const db = browserClient();
        // @supabase/ssr çerezleri kendisi yazar; oturumun oturması yeterli.
        const { data, error: authError } = await db.auth.getSession();
        if (authError) throw new Error(authError.message);
        if (!data.session) throw new Error('Oturum kurulamadı. Bağlantı süresi geçmiş olabilir.');
        if (!cancelled) window.location.replace('/admin');
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Bilinmeyen hata');
        }
      }
    }

    // Supabase URL parçasını okuyup oturumu kurana kadar kısa bir an geçiyor.
    const timer = setTimeout(run, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (error) {
    return (
      <div className="mt-4">
        <p className="rounded-md border border-bad/30 bg-bad/[0.06] p-2.5 text-xs text-bad">
          {error}
        </p>
        <a
          href="/admin/giris"
          className="mt-3 inline-block rounded-md border border-line bg-surface-2 px-3 py-2 text-xs transition-colors duration-hover ease-out hover:border-line-strong"
        >
          Tekrar dene
        </a>
      </div>
    );
  }

  return (
    <p className="mt-4 text-xs text-text-muted" aria-live="polite">
      Bir saniye…
    </p>
  );
}
