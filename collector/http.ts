import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@/lib/constants';

/**
 * Dış dünyaya çıkan tek kapı. Her istek timeout'lu, User-Agent dürüst,
 * robots.txt'ye uyulur ve aynı hedefe kısa aralıkla ikinci istek atılmaz.
 */

export type FetchTextResult =
  | { ok: true; body: string; status: number }
  | { ok: false; error: string; status: number | null };

/** Aynı süreçte aynı origin'e en az bu kadar ara verilir. */
const MIN_HOST_INTERVAL_MS = 1000;
const lastHitAt = new Map<string, number>();

async function politeWait(origin: string): Promise<void> {
  const last = lastHitAt.get(origin);
  const now = Date.now();
  if (last !== undefined) {
    const wait = MIN_HOST_INTERVAL_MS - (now - last);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastHitAt.set(origin, Date.now());
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return `zaman aşımı (${REQUEST_TIMEOUT_MS}ms)`;
    }
    return error.message;
  }
  return String(error);
}

export async function fetchText(
  url: string,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<FetchTextResult> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return { ok: false, error: 'geçersiz URL', status: null };
  }

  await politeWait(origin);

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'tr,en;q=0.8',
      },
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, status: response.status };
    }

    return { ok: true, body: await response.text(), status: response.status };
  } catch (error) {
    return { ok: false, error: describe(error), status: null };
  }
}

// --- robots.txt ------------------------------------------------------------

/**
 * Çok küçük bir robots.txt yorumlayıcısı: sadece bizi ilgilendiren
 * `User-agent: *` ve bizim ajan adımıza ait Disallow satırlarını okur.
 * Şüphede kalırsak izin veririz (robots.txt yoksa/okunamazsa erişim serbesttir),
 * ama açık bir Disallow varsa kesin uyulur.
 */
export function parseRobots(body: string): string[] {
  const disallows: string[] = [];
  let applies = false;

  for (const rawLine of body.split('\n')) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (line === '') continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;

    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === 'user-agent') {
      const agent = value.toLowerCase();
      applies = agent === '*' || agent.includes('metin2radarbot');
      continue;
    }

    if (field === 'disallow' && applies && value !== '') {
      disallows.push(value);
    }
  }

  return disallows;
}

export function isAllowedByRobots(disallows: string[], pathname: string): boolean {
  return !disallows.some((rule) => pathname.startsWith(rule));
}

const robotsCache = new Map<string, string[]>();

/** robots.txt origin başına bir kez çekilir, süreç boyunca önbelleklenir. */
export async function canFetch(url: string): Promise<{ allowed: boolean; reason?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'geçersiz URL' };
  }

  let disallows = robotsCache.get(parsed.origin);

  if (disallows === undefined) {
    const result = await fetchText(`${parsed.origin}/robots.txt`, 5000);
    disallows = result.ok ? parseRobots(result.body) : [];
    robotsCache.set(parsed.origin, disallows);
  }

  if (!isAllowedByRobots(disallows, parsed.pathname)) {
    return { allowed: false, reason: 'robots.txt izin vermiyor' };
  }

  return { allowed: true };
}

/** Testler ve uzun süren süreçler için önbellek sıfırlama. */
export function resetHttpCaches(): void {
  robotsCache.clear();
  lastHitAt.clear();
}
