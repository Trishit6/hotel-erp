import { randomBytes, randomUUID } from "node:crypto";

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newReference(): string {
  const bytes = randomBytes(6);
  let suffix = "";
  for (const byte of bytes) suffix += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  return `RIVR-${suffix}`;
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newSessionId(): string {
  return `sess-${randomUUID()}`;
}
