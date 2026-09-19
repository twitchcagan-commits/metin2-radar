import { NextResponse } from 'next/server';
import { z } from 'zod';

import { fail, guard } from '@/lib/admin-api';
import { AD_PLACEMENTS } from '@/lib/constants';

export const runtime = 'nodejs';

/**
 * Reklam envanteri yönetimi.
 *
 * Buradan yazılan hiçbir alan sıralamaya girmez: skor hesabı ads tablosunu
 * hiç okumaz. Reklam sadece kendi ayrı bloğunda, "Reklam" etiketiyle görünür.
 */
const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const schema = z.object({
  id: z.string().uuid().nullish(),
  server_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  placement: z.enum(AD_PLACEMENTS),
  starts_at: z.string(),
  ends_at: z.preprocess(emptyToNull, z.string().nullable()),
  image_url: z.preprocess(emptyToNull, z.string().url().nullable()),
  target_url: z.preprocess(emptyToNull, z.string().url().nullable()),
  is_active: z.boolean(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const guarded = await guard(request, schema);
  if (!guarded.ok) return guarded.response;

  const { db, body } = guarded;
  const { id, ...fields } = body;

  if (id) {
    const { error } = await db.from('ads').update(fields).eq('id', id);
    if (error) return fail(`Reklam güncellenemedi: ${error.message}`);
    return NextResponse.json({ ok: true, id });
  }

  const { data, error } = await db.from('ads').insert(fields).select('id').single();
  if (error) return fail(`Reklam eklenemedi: ${error.message}`);
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
