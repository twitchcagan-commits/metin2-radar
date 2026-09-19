import '@/lib/load-env';

/**
 * Slash komutlarını Discord'a kaydeder. Tek seferlik / komut değişince çalışır:
 *   npx tsx scripts/register-commands.ts
 *
 * Global komut kaydı Discord tarafında bir saate kadar yayılabilir.
 */

const APPLICATION_COMMAND_OPTION_STRING = 3;

const commands = [
  {
    name: 'acilislar',
    description: 'Yaklaşan Metin2 PVP sunucu açılışlarını listeler',
  },
  {
    name: 'sv',
    description: 'Bir sunucunun radar skorunu, trendini ve uyarılarını gösterir',
    options: [
      {
        type: APPLICATION_COMMAND_OPTION_STRING,
        name: 'isim',
        description: 'Sunucu adı ya da adres kısaltması',
        required: true,
      },
    ],
  },
  {
    name: 'mezarlik',
    description: 'Kapanmış sunucuları ve kaç gün yaşadıklarını gösterir',
  },
];

async function main(): Promise<void> {
  const appId = process.env.DISCORD_APP_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !token) {
    throw new Error(
      'DISCORD_APP_ID ve DISCORD_BOT_TOKEN gerekli. .env.example dosyasına bak.',
    );
  }

  const response = await fetch(
    `https://discord.com/api/v10/applications/${appId}/commands`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bot ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(commands),
    },
  );

  if (!response.ok) {
    throw new Error(`Discord ${response.status}: ${await response.text()}`);
  }

  const registered: { name: string }[] = await response.json();
  console.log(
    `Komutlar kaydedildi: ${registered.map((command) => `/${command.name}`).join(', ')}`,
  );
}

main().catch((error: unknown) => {
  console.error('Komut kaydı başarısız:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
