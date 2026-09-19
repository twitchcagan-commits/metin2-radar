import { z } from 'zod';

import { fetchText } from '@/collector/http';

/**
 * Discord sunucu widget'ı. Ücretsiz, anahtarsız, herkese açık uç.
 * Widget kapalıysa 403 döner — bu bir hatadır ama sunucuyu düşürmez.
 */

const widgetSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  presence_count: z.number().int().nonnegative().optional(),
  members: z.array(z.unknown()).optional(),
});

export type DiscordSample = {
  online: number | null;
  /**
   * Widget yalnızca en fazla 100 üye listeler, bu yüzden toplam üye sayısını
   * widget'tan güvenilir biçimde alamıyoruz. Listelenen sayı 100'e dayanmışsa
   * "en az 100" demek olur; bunu null bırakıp yanlış veri yazmıyoruz.
   */
  members: number | null;
  error: string | null;
};

const WIDGET_MEMBER_LIST_CAP = 100;

export function interpretWidget(raw: unknown): DiscordSample {
  const parsed = widgetSchema.safeParse(raw);
  if (!parsed.success) {
    return { online: null, members: null, error: 'widget yanıtı beklenen biçimde değil' };
  }

  const listed = parsed.data.members?.length ?? null;

  return {
    online: parsed.data.presence_count ?? null,
    members:
      listed === null || listed >= WIDGET_MEMBER_LIST_CAP ? null : listed,
    error: null,
  };
}

export async function readDiscordWidget(guildId: string): Promise<DiscordSample> {
  const url = `https://discord.com/api/guilds/${encodeURIComponent(guildId)}/widget.json`;
  const result = await fetchText(url);

  if (!result.ok) {
    const error =
      result.status === 403
        ? 'widget kapalı (sunucu ayarlarından açılmalı)'
        : result.status === 404
          ? 'sunucu bulunamadı'
          : result.error;
    return { online: null, members: null, error };
  }

  try {
    return interpretWidget(JSON.parse(result.body));
  } catch {
    return { online: null, members: null, error: 'widget yanıtı JSON değil' };
  }
}
