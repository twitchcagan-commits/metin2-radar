import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { publicEnv, serviceEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

export type Db = SupabaseClient<Database>;

/**
 * Okuma için anon istemci. RLS açık, public tablolarda sadece SELECT görür.
 * Sunucu bileşenlerinden ve route handler'lardan kullanılır.
 */
export function readClient(): Db {
  const env = publicEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
}

/**
 * Yazma için service_role istemci. RLS'i baypas eder.
 * SADECE collector, günlük job'lar ve yönetim uçları. Tarayıcıya asla gitmez.
 */
export function serviceClient(): Db {
  const env = serviceEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Supabase henüz bağlanmadıysa site çökmemeli: sayfalar boş durum gösterir.
 * Bu yüzden okuma katmanı önce burayı sorar.
 */
export function isConfigured(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}
