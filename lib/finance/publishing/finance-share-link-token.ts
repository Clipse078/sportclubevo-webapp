/**
 * FIN-06A — share link token hashing (no plaintext persistence).
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const SHARE_TOKEN_BYTES = 32;

export function generateFinanceShareLinkToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
  return { rawToken, tokenHash: hashFinanceShareLinkToken(rawToken) };
}

export function hashFinanceShareLinkToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function verifyFinanceShareLinkToken(rawToken: string, expectedHash: string): boolean {
  const actual = hashFinanceShareLinkToken(rawToken);
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
