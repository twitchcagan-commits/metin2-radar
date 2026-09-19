import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { publicEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

/**
 * Oturum taşıyan Supabase istemcisi (çerez tabanlı).
 * Sadece yönetim tarafında kullanılır; herkese açık sayfalar anon istemciyle
 * okur ve çerez taşımaz (böylece tam statik önbelleklenebilirler).
 */
export async function authClient() {
  const env = publicEnv();
  const store = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) {
              store.set(name, value, options);
            }
          } catch {
            // Sunucu bileşeninden çağrıldığında çerez yazılamaz; oturum
            // yenilemesi route handler / middleware tarafında yapılır.
          }
        },
      },
    },
  );
}
