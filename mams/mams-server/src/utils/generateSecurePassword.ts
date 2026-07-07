import { randomBytes } from 'node:crypto';
import { PASSWORD_SPECIALS, passwordPolicyScore } from './passwordPolicy.js';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const ALL = LOWER + UPPER + DIGITS + PASSWORD_SPECIALS;

function pick(pool: string): string {
  return pool[randomBytes(1)[0]! % pool.length]!;
}

/** Generate a random password satisfying PasswordSchema (10+ chars, 3 of 4 classes). */
export function generateSecurePassword(length = 16): string {
  const targetLen = Math.max(10, length);
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(PASSWORD_SPECIALS)];
  const chars: string[] = [...required];
  while (chars.length < targetLen) {
    chars.push(pick(ALL));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  const password = chars.join('');
  if (passwordPolicyScore(password) < 3) {
    return generateSecurePassword(length);
  }
  return password;
}
