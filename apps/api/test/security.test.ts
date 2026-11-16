import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { decrypt, draw, encrypt, hash, token } from '../src/security';

describe('draw', () => {
  it('assigns every participant exactly once without self assignment', () => {
    for (let n = 2; n <= 30; n++) {
      const participants = Array.from({ length: n }, (_, i) => i);
      for (let attempt = 0; attempt < 20; attempt++) {
        const matches = draw(participants);
        expect(new Set(matches).size).toBe(n);
        expect(matches.every((match, i) => match !== participants[i])).toBe(true);
      }
    }
  });
  it('rejects fewer than two participants', () => { expect(() => draw([1])).toThrow(); });
});
describe('link tokens', () => {
  it('encrypts and recovers tokens while storing a distinct hash', () => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const value = token(); const encrypted = encrypt(value);
    expect(decrypt(encrypted)).toBe(value);
    expect(encrypted).not.toContain(value);
    expect(hash(value)).not.toBe(value);
    expect(token()).not.toBe(value);
  });
});
