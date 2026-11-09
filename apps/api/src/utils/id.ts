import { randomBytes, randomUUID } from "node:crypto";

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REFERENCE_RANDOM_LENGTH = 10;
export const REFERENCE_MAX_ATTEMPTS = 5;

export function newReference(): string {
  const bytes = randomBytes(REFERENCE_RANDOM_LENGTH);
  let suffix = "";
  for (const byte of bytes) suffix += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  return `RIVR-${suffix}`;
}

/**
 * Allocate a reference with a bounded collision retry. The callback is
 * responsible for checking the database (or any other authoritative store).
 */
export async function generateUniqueReference(
  isTaken: (reference: string) => Promise<boolean>,
  generate: () => string = newReference,
  maxAttempts = REFERENCE_MAX_ATTEMPTS,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generate();
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("Unable to allocate a unique reservation reference.");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newSessionId(): string {
  return `sess-${randomUUID()}`;
}
