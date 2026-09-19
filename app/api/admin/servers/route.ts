import { NextResponse } from 'next/server';
import { z } from 'zod';

import { fail, guard } from '@/lib/admin-api';
import { SERVER_STATUSES, SERVER_TYPES } from '@/lib/constants';

export const runtime = 'nodejs';

const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const schema = z.object({
  /** Varsa güncelleme, yoksa yeni kayıt. */
  id: z.string().uuid().nullish(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'sadece küçük harf, rakam ve tire'),
  name: z.string().min(2).max(120),
  website_url: z.preprocess(emptyToNull, z.string().url().nullable()),
  download_url: z.preprocess(emptyToNull, z.string().url().nullable()),
  discord_guild_id: z.preprocess(emptyToNull, z.string().regex(/^\d+$/).nullable()),
  discord_invite: z.preprocess(emptyToNull, z.string().url().nullable()),
  game_host: z.preprocess(emptyToNull, z.string().max(200).nullable()),
  game_port: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z.number().int().min(1).max(65535).nullable(),
  ),
  logo_url: z.preprocess(emptyToNull, z.string().url().nullable()),
  level_range: z.preprocess(emptyToNull, z.string().max(40).nullable()),
  server_type: z.preprocess(emptyToNull, z.enum(SERVER_TYPES).nullable()),
  opens_at: z.preprocess(emptyToNull, z.string().nullable()),
  status: z.enum(SERVER_STATUSES),
  died_at: z.preprocess(emptyToNull, z.string().nullable()),
  owner_key: z.preprocess(emptyToNull, z.string().max(80).nullable()),
  is_verified: z.boolean(),
  counter_selector: z.preprocess(emptyToNull, z.string().max(300).nullable()),
  counter_url: z.preprocess(emptyToNull, z.string().url().nullable()),
});

export async function POST(request: Request): Promise<NextResponse> {
  const guarded = await guard(request, schema);
  if (!guarded.ok) return guarded.response;

  const { db, body } = guarded;
  const { id, ...fields } = body;

  // Slug benzersizliği: aynı slug başka bir kayıtta varsa reddet.
  const { data: clash } = await db
    .from('servers')
    .select('id')
    .eq('slug', fields.slug)
    .maybeSingle();
  if (clash && clash.id !== id) {
    return fail(`"${fields.slug}" slug'ı başka bir sunucuda kullanılıyor.`, 409);
  }

  // owner_key verildiyse owners tablosunda karşılığı olmalı (FK).
  if (fields.owner_key) {
    const { error: ownerError } = await db
      .from('owners')
      .upsert({ owner_key: fields.owner_key, display_name: fields.owner_key, notes: null }, {
        onConflict: 'owner_key',
        ignoreDuplicates: true,
      });
    if (ownerError) return fail(`Sahip kaydı oluşturulamadı: ${ownerError.message}`);
  }

  if (id) {
    const { error } = await db.from('servers').update(fields).eq('id', id);
    if (error) return fail(`Güncellenemedi: ${error.message}`);
    return NextResponse.json({ ok: true, id });
  }

  const { data, error } = await db.from('servers').insert(fields).select('id').single();
  if (error) return fail(`Eklenemedi: ${error.message}`);

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
