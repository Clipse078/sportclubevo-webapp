/**
 * FIN-06E-R5 — deployment persistence contract for public DISTRIBUTION shares.
 *
 * Used by automated guards and optional STAGE read-only verify scripts.
 * PostgreSQL enum value must exist before Prisma can persist or read shareKind=DISTRIBUTION.
 */

export const FINANCE_PUBLICATION_SHARE_KIND_DISTRIBUTION = "DISTRIBUTION" as const;

/** Read-only: returns a row when DISTRIBUTION exists on FinancePublicationShareKind. */
export const FINANCE_PUBLICATION_SHARE_KIND_DISTRIBUTION_PG_CHECK_SQL = `
SELECT e.enumlabel AS share_kind
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'FinancePublicationShareKind'
  AND e.enumlabel = 'DISTRIBUTION'
LIMIT 1
`;

export const FINANCE_06E_PUBLIC_SHARE_REQUIRED_COLUMNS = [
  "publicToken",
  "shareKind",
  "accessCount",
  "lastAccessedAt",
] as const;
