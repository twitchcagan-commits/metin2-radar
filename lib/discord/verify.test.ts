import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { verifySignature } from '@/lib/discord/verify';

/**
 * Gerçek bir ed25519 anahtar çiftiyle test ediyoruz — imza doğrulamasını
 * taklitle test etmek hiçbir şey kanıtlamaz. Doğrulama kırılırsa herkes
 * bizim adımıza Discord komutu çalıştırabilir.
 */
function makeKeyPair(): { publicHex: string; sign: (message: string) => string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);

  return {
    publicHex: raw.toString('hex'),
    sign: (message: string) =>
      cryptoSign(null, Buffer.from(message, 'utf8'), privateKey).toString('hex'),
  };
}

const now = (): string => String(Math.floor(Date.now() / 1000));

describe('verifySignature', () => {
  it('geçerli imzayı kabul eder', () => {
    const { publicHex, sign } = makeKeyPair();
    const body = JSON.stringify({ type: 1 });
    const timestamp = now();

    expect(verifySignature(body, sign(timestamp + body), timestamp, publicHex)).toBe(true);
  });

  it('gövde değiştirilmişse reddeder', () => {
    const { publicHex, sign } = makeKeyPair();
    const timestamp = now();
    const signature = sign(timestamp + JSON.stringify({ type: 1 }));

    expect(
      verifySignature(JSON.stringify({ type: 2 }), signature, timestamp, publicHex),
    ).toBe(false);
  });

  it('başka bir anahtarla imzalanmışsa reddeder', () => {
    const victim = makeKeyPair();
    const attacker = makeKeyPair();
    const body = JSON.stringify({ type: 1 });
    const timestamp = now();

    expect(
      verifySignature(body, attacker.sign(timestamp + body), timestamp, victim.publicHex),
    ).toBe(false);
  });

  it('eski zaman damgasını reddeder (tekrar saldırısı)', () => {
    const { publicHex, sign } = makeKeyPair();
    const body = JSON.stringify({ type: 1 });
    const old = String(Math.floor(Date.now() / 1000) - 3600);

    expect(verifySignature(body, sign(old + body), old, publicHex)).toBe(false);
  });

  it('eksik başlıkları reddeder', () => {
    const { publicHex } = makeKeyPair();
    expect(verifySignature('{}', null, now(), publicHex)).toBe(false);
    expect(verifySignature('{}', 'aa'.repeat(64), null, publicHex)).toBe(false);
  });

  it('açık anahtar tanımlı değilse reddeder', () => {
    expect(verifySignature('{}', 'aa'.repeat(64), now(), undefined)).toBe(false);
  });

  it('bozuk biçimli girdide patlamaz, reddeder', () => {
    const { publicHex } = makeKeyPair();
    expect(verifySignature('{}', 'not-hex', now(), publicHex)).toBe(false);
    expect(verifySignature('{}', 'aa'.repeat(64), now(), 'kısa')).toBe(false);
    expect(verifySignature('{}', 'aa'.repeat(64), 'zaman-değil', publicHex)).toBe(false);
  });
});
