/**
 * FIN-06D — publication share capability identifiers.
 *
 * R2: publicToken is a high-entropy opaque capability URL segment (persisted for reuse).
 * R1 legacy: only SHA-256 digest stored; external links still resolve via hash lookup.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const SHARE_TOKEN_BYTES = 32;

export function generateFinancePublicationSharePublicToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

/** @deprecated R1 creation path — prefer generateFinancePublicationSharePublicToken */
export function generateFinanceShareLinkToken(): { rawToken: string; tokenHash: string } {
  const rawToken = generateFinancePublicationSharePublicToken();
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
