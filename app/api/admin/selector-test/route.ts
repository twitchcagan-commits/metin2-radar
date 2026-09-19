import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readSiteCounter } from '@/collector/sources/counter';
import { guard } from '@/lib/admin-api';

export const runtime = 'nodejs';

/**
 * SELECTOR TEST BUTONU.
 *
 * Panelde girilen counter_url + counter_selector ikilisini toplayıcının
 * kullandığı KODUN AYNISIYLA dener. Ayrı bir uygulama yazmıyoruz — yoksa
 * panelde çalışan selector üretimde patlar.
 */
const schema = z.object({
  counter_url: z.string().url(),
  counter_selector: z.string().min(1).max(300),
});

export async function POST(request: Request): Promise<NextResponse> {
  const guarded = await guard(request, schema);
  if (!guarded.ok) return guarded.response;

  const { counter_url, counter_selector } = guarded.body;
  const result = await readSiteCounter(counter_url, counter_selector);

  return NextResponse.json({
    ok: result.online !== null,
    online: result.online,
    error: result.error,
    selectorFailed: result.selectorFailed,
  });
}
