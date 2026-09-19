import { NextResponse } from 'next/server';
import { z } from 'zod';

import { fail, guard } from '@/lib/admin-api';

export const runtime = 'nodejs';

/**
 * Yanlış pozitif flag'i elle kapatma.
 *
 * Tespit modülü sağlam ama kusursuz değil; suçsuz bir sunucuyu "sahte" diye
 * damgalamak sıralamayı satmaktan daha kötü. Bu yüzden elle kapatma şart.
 * Not: günlük job sinyali hâlâ görüyorsa flag'i yeniden açar — kalıcı çözüm
 * için eşiklerin değişmesi gerekir.
 */
const schema = z.object({
  id: z.number().int().positive(),
  is_active: z.boolean(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const guarded = await guard(request, schema);
  if (!guarded.ok) return guarded.response;

  const { db, body } = guarded;
  const { error } = await db
    .from('flags')
    .update({ is_active: body.is_active })
    .eq('id', body.id);

  if (error) return fail(`Flag güncellenemedi: ${error.message}`);
  return NextResponse.json({ ok: true });
}
