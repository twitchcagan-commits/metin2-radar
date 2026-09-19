import { isConfigured } from '@/lib/supabase/server';
import { authClient } from '@/lib/supabase/rsc';

/**
 * Yönetim erişimi: Supabase Auth oturumu + e-posta izin listesi.
 *
 * İki kapı var çünkü Supabase'te kayıt açık kalabilir; oturum açmış olmak
 * yönetici olmak demek değil. ADMIN_EMAILS dışındaki her hesap 403 görür.
 */

export type AdminUser = { id: string; email: string };

function allowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function isAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = allowlist();
  if (list.length === 0) return false;
  return list.includes(email.toLowerCase());
}

/** Oturum açmış yönetici ya da null. Sayfa/route bunu görüp karar verir. */
export async function currentAdmin(): Promise<AdminUser | null> {
  if (!isConfigured()) return null;

  const db = await authClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user?.email) return null;
  if (!isAllowlisted(data.user.email)) return null;

  return { id: data.user.id, email: data.user.email };
}

/** İzin listesi hiç tanımlanmadıysa panel kilitli kalır; bunu arayüzde söyleriz. */
export function allowlistConfigured(): boolean {
  return allowlist().length > 0;
}
