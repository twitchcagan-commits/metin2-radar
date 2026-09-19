import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { currentAdmin } from '@/lib/auth';
import { serviceClient, type Db } from '@/lib/supabase/server';

/**
 * Yönetim uçları için ortak kapı.
 *
 * Her uç iki şeyi garanti eder: (1) istek oturum açmış ve izin listesindeki
 * bir yöneticiden geliyor, (2) gövde zod ile doğrulanmış. Yazma service_role
 * ile yapılır, bu yüzden kapının sızdırmaması kritik.
 */

export type Guarded<T> =
  | { ok: true; db: Db; body: T }
  | { ok: false; response: NextResponse };

export async function guard<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<Guarded<z.infer<S>>> {
  const admin = await currentAdmin();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, reason: 'yetki yok' }, { status: 403 }),
    };
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, reason: 'geçersiz gövde' }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          reason: 'doğrulama hatası',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 422 },
      ),
    };
  }

  return { ok: true, db: serviceClient(), body: parsed.data };
}

export function fail(message: string, status = 500): NextResponse {
  return NextResponse.json({ ok: false, reason: message }, { status });
}
