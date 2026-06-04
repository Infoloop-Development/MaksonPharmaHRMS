/**
 * Park-Miller (Lehmer) linear congruential PRNG.
 * Ported from the approved mockup so production output matches mockup behaviour.
 *
 * Modulus: 2^31 - 1 (Mersenne prime, 2147483647)
 * Multiplier: 16807 (proven good for this modulus)
 *
 * NOT cryptographically secure - this is for deterministic seeded
 * randomness in Smart Anchor v2 only. Same seed always produces the
 * same sequence, which makes audit reproducibility trivial.
 */
export function seededRandom(seed: number): () => number {
  let x = seed % 2147483647;
  if (x <= 0) x += 2147483646;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
}

/**
 * Stable string-to-int hash. djb2 variant.
 * Used to seed the PRNG from (employeeId + date) keys.
 */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  // Force into positive 31-bit range
  return Math.abs(h) % 2147483647 || 1;
}
