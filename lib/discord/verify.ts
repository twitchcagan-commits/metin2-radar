import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

/**
 * Discord HTTP Interactions ed25519 imza doğrulaması.
 *
 * Kütüphane kurmuyoruz: Node'un kendi crypto'su Ed25519'u destekliyor.
 * Tek eksik, Discord'un ham 32 baytlık açık anahtarını DER (SPKI) biçimine
 * sarmak — aşağıdaki önek sabit ve standarttır (RFC 8410).
 */

const SPKI_ED25519_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/** Tekrar saldırısına karşı: 5 dakikadan eski istek kabul edilmez. */
const MAX_TIMESTAMP_SKEW_SECONDS = 300;

function isHex(value: string, bytes: number): boolean {
  return value.length === bytes * 2 && /^[0-9a-fA-F]+$/.test(value);
}

export function verifySignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKeyHex: string | undefined,
): boolean {
  if (!signature || !timestamp || !publicKeyHex) return false;
  if (!isHex(signature, 64) || !isHex(publicKeyHex, 32)) return false;

  const sentAt = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(sentAt)) return false;
  const skew = Math.abs(Date.now() / 1000 - sentAt);
  if (skew > MAX_TIMESTAMP_SKEW_SECONDS) return false;

  try {
    const key = createPublicKey({
      key: Buffer.concat([SPKI_ED25519_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
      format: 'der',
      type: 'spki',
    });

    return cryptoVerify(
      null,
      Buffer.from(timestamp + rawBody, 'utf8'),
      key,
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}
