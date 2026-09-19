import { NextResponse } from 'next/server';
import { z } from 'zod';

import { CLICK_KINDS } from '@/lib/constants';
import { clientIp, hashWithDailySalt } from '@/lib/hash';
import { isConfigured, serviceClient } from '@/lib/supabase/server';

/**
 * Kendi tıklama verimiz — skorun en güvenilir bileşeni (25 puan).
 * Sunucu sahibi bunu şişiremez: sayacı değil bizim sayfamızdaki tıklamayı ölçer.
 *
 * Yazma service_role ile yapılır (clicks tablosunda public INSERT yok).
 */

export const runtime = 'nodejs';

const bodySchema = z.object({
  slug: z.string().min(1).max(120),
  kind: z.enum(CLICK_KINDS),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!isConfigured()) {
    // Supabase bağlanmadıysa sessizce geç: kullanıcı yine hedefe gitsin.
    return NextResponse.json({ ok: false, reason: 'yapılandırılmadı' }, { status: 200 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'geçersiz gövde' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: 'geçersiz alanlar' }, { status: 400 });
  }

  try {
    const db = serviceClient();

    const { data: server } = await db
      .from('servers')
      .select('id')
      .eq('slug', parsed.data.slug)
      .maybeSingle();

    if (!server) {
      return NextResponse.json({ ok: false, reason: 'sunucu yok' }, { status: 404 });
    }

    const ip = clientIp(request.headers);
    const ua = request.headers.get('user-agent');

    const { error } = await db.from('clicks').insert({
      server_id: server.id,
      kind: parsed.data.kind,
      ip_hash: ip ? hashWithDailySalt(ip) : null,
      ua_hash: ua ? hashWithDailySalt(ua) : null,
    });

    if (error) {
      console.error('Tıklama yazılamadı:', error.message);
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Tıklama kaydı hatası:', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
