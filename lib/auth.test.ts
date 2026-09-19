import { afterEach, describe, expect, it } from 'vitest';

import { allowlistConfigured, isAllowlisted } from '@/lib/auth';

const original = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = original;
});

describe('isAllowlisted', () => {
  it('listedeki e-postayı kabul eder, büyük/küçük harf ayırmaz', () => {
    process.env.ADMIN_EMAILS = 'sahip@example.com, ikinci@example.com';
    expect(isAllowlisted('sahip@example.com')).toBe(true);
    expect(isAllowlisted('SAHIP@Example.COM')).toBe(true);
    expect(isAllowlisted('ikinci@example.com')).toBe(true);
  });

  it('listede olmayanı reddeder', () => {
    process.env.ADMIN_EMAILS = 'sahip@example.com';
    expect(isAllowlisted('yabanci@example.com')).toBe(false);
  });

  it('liste boşsa hiç kimseyi kabul etmez (güvenli taraf)', () => {
    process.env.ADMIN_EMAILS = '';
    expect(isAllowlisted('sahip@example.com')).toBe(false);
    expect(allowlistConfigured()).toBe(false);
  });

  it('e-posta yoksa reddeder', () => {
    process.env.ADMIN_EMAILS = 'sahip@example.com';
    expect(isAllowlisted(null)).toBe(false);
    expect(isAllowlisted(undefined)).toBe(false);
  });
});
