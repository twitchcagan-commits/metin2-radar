import '@/lib/load-env';

import { serviceClient } from '@/lib/supabase/server';
import type { ServerStatus, ServerType } from '@/lib/constants';

/**
 * Geliştirme verisi. Gerçek sunucu değil, hepsi uydurma isim.
 * Çalıştır: npm run seed
 */

interface SeedOwner {
  owner_key: string;
  display_name: string;
  notes: string | null;
}

interface SeedServer {
  slug: string;
  name: string;
  website_url: string | null;
  download_url: string | null;
  discord_guild_id: string | null;
  discord_invite: string | null;
  game_host: string | null;
  game_port: number | null;
  logo_url: string | null;
  level_range: string | null;
  server_type: ServerType | null;
  opens_at: string | null;
  status: ServerStatus;
  died_at: string | null;
  owner_key: string | null;
  is_verified: boolean;
  counter_selector: string | null;
  counter_url: string | null;
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

const owners: SeedOwner[] = [
  {
    owner_key: 'kartal',
    display_name: 'Kartal',
    notes: 'Örnek sahip: art arda kısa ömürlü sunucu açan profil.',
  },
  {
    owner_key: 'anka',
    display_name: 'Anka Yapım',
    notes: 'Örnek sahip: tek uzun soluklu sunucu.',
  },
];

const servers: SeedServer[] = [
  {
    slug: 'ornek-anka2',
    name: 'Anka2',
    website_url: 'https://example.com/anka2',
    download_url: 'https://example.com/anka2/indir',
    discord_guild_id: '000000000000000001',
    discord_invite: 'https://discord.gg/ornek1',
    game_host: 'game.example.com',
    game_port: 13000,
    logo_url: null,
    level_range: '1-120',
    server_type: 'orta_emek',
    opens_at: daysFromNow(-180),
    status: 'active',
    died_at: null,
    owner_key: 'anka',
    is_verified: true,
    counter_selector: '#online-count',
    counter_url: 'https://example.com/anka2',
  },
  {
    slug: 'ornek-kartal-pvp',
    name: 'Kartal PVP',
    website_url: 'https://example.com/kartal',
    download_url: 'https://example.com/kartal/indir',
    discord_guild_id: '000000000000000002',
    discord_invite: 'https://discord.gg/ornek2',
    game_host: 'kartal.example.com',
    game_port: 13000,
    logo_url: null,
    level_range: '1-105',
    server_type: 'wslik',
    opens_at: daysFromNow(-21),
    status: 'active',
    died_at: null,
    owner_key: 'kartal',
    is_verified: false,
    counter_selector: '.online .value',
    counter_url: 'https://example.com/kartal',
  },
  {
    slug: 'ornek-zirve2',
    name: 'Zirve2',
    website_url: 'https://example.com/zirve2',
    download_url: null,
    discord_guild_id: '000000000000000003',
    discord_invite: 'https://discord.gg/ornek3',
    game_host: null,
    game_port: null,
    logo_url: null,
    level_range: '1-99',
    server_type: 'zor_emek',
    opens_at: daysFromNow(3),
    status: 'upcoming',
    died_at: null,
    owner_key: null,
    is_verified: false,
    counter_selector: null,
    counter_url: null,
  },
  {
    slug: 'ornek-firtina',
    name: 'Fırtına',
    website_url: 'https://example.com/firtina',
    download_url: 'https://example.com/firtina/indir',
    discord_guild_id: '000000000000000004',
    discord_invite: null,
    game_host: 'firtina.example.com',
    game_port: 13001,
    logo_url: null,
    level_range: '1-250',
    server_type: 'farm',
    opens_at: daysFromNow(-95),
    status: 'dead',
    died_at: daysFromNow(-77),
    owner_key: 'kartal',
    is_verified: false,
    counter_selector: '#players',
    counter_url: 'https://example.com/firtina',
  },
  {
    slug: 'ornek-global-arena',
    name: 'Global Arena',
    website_url: 'https://example.com/global',
    download_url: 'https://example.com/global/indir',
    discord_guild_id: '000000000000000005',
    discord_invite: 'https://discord.gg/ornek5',
    game_host: 'global.example.com',
    game_port: 13000,
    logo_url: null,
    level_range: '1-120',
    server_type: 'global',
    opens_at: daysFromNow(-400),
    status: 'active',
    died_at: null,
    owner_key: 'anka',
    is_verified: true,
    counter_selector: 'span.online-now',
    counter_url: 'https://example.com/global',
  },
];

async function main(): Promise<void> {
  const db = serviceClient();

  const ownerResult = await db.from('owners').upsert(owners, { onConflict: 'owner_key' });
  if (ownerResult.error) throw new Error(`owners: ${ownerResult.error.message}`);

  const serverResult = await db.from('servers').upsert(servers, { onConflict: 'slug' });
  if (serverResult.error) throw new Error(`servers: ${serverResult.error.message}`);

  console.log(`Seed tamam: ${owners.length} sahip, ${servers.length} sunucu.`);
}

main().catch((error: unknown) => {
  console.error('Seed başarısız:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
