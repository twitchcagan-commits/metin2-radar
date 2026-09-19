import type { Ad } from '@/components/AdSlot';
import type { AdPlacement } from '@/lib/constants';
import { isConfigured, readClient } from '@/lib/supabase/server';

/**
 * Yayında olan reklamlar. RLS zaten tarih aralığını süzüyor, burada
 * yerleşime göre ayırıyoruz.
 *
 * Reklamlar hiçbir sıralama sorgusuna karışmaz — ayrı fonksiyon, ayrı blok.
 */
export async function getAds(placement: AdPlacement, limit = 4): Promise<Ad[]> {
  if (!isConfigured()) return [];

  const db = readClient();
  const { data, error } = await db
    .from('ads')
    .select('id, image_url, target_url, server_id')
    .eq('placement', placement)
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    imageUrl: row.image_url,
    targetUrl: row.target_url,
    label: null,
  }));
}
