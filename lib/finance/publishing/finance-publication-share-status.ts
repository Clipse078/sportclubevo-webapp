/**
 * FIN-06D — derived publication share lifecycle (no redundant EXPIRED persistence).
 */

export type FinancePublicationShareDerivedStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export function deriveFinancePublicationShareStatus(input: {
  revokedAt: Date | null;
  expiresAt: Date | null;
  now?: Date;
}): FinancePublicationShareDerivedStatus {
  const now = input.now ?? new Date();
  if (input.revokedAt) return "REVOKED";
  if (input.expiresAt && input.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return "ACTIVE";
}

export function isFinancePublicationShareExternallyAccessible(input: {
  revokedAt: Date | null;
  expiresAt: Date | null;
  now?: Date;
}): boolean {
  return deriveFinancePublicationShareStatus(input) === "ACTIVE";
}
