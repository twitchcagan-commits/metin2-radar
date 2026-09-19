'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/lib/supabase/types';

/**
 * Tarayıcı istemcisi. Yalnızca anon anahtar taşır; service_role asla buraya gelmez.
 * Sadece yönetim girişinde (magic link) kullanılır.
 */
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase yapılandırılmamış: NEXT_PUBLIC_SUPABASE_* eksik.');
  }

  return createBrowserClient<Database>(url, key);
}
