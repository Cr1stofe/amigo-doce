import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const token = () => randomBytes(32).toString('base64url');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function equal(a: string, b: string) { return timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b))); }
function key() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || Buffer.from(secret, 'base64').length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be a base64 encoded 32-byte key');
  return Buffer.from(secret, 'base64');
}
export function encrypt(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(x => x.toString('base64url')).join('.');
}
export function decrypt(value: string) {
  const [iv, tag, ciphertext] = value.split('.').map(x => Buffer.from(x, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
export function draw<T>(items: T[]): T[] {
  if (items.length < 2) throw new Error('At least two participants are required');
  const order = [...items];
  for (let i = order.length - 1; i > 0; i--) { const j = randomInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  const result = new Map<T, T>();
  order.forEach((item, i) => result.set(item, order[(i + 1) % order.length]));
  return items.map(item => result.get(item)!);
}
