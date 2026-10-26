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

/**
 * Cross-deployment invariant (Preview ↔ canonical STAGE host):
 * a deployment must not emit recipient links that target a concurrently active
 * runtime which cannot deserialize values it writes into a shared database
 * (for example FinancePublicationShareKind.DISTRIBUTION before FIN-06E merges).
 *
 * Preview distribution emails therefore use {@link resolvePublicActionBaseUrl}
 * (VERCEL_URL / PUBLIC_ACTION_BASE_URL) for view/PDF capability URLs while
 * tenant branding assets remain on the canonical APP_BASE_URL host.
 */
export const FINANCE_06E_CROSS_DEPLOYMENT_PUBLIC_LINK_INVARIANT =
  "SEND_RUNTIME_COMPATIBLE_WITH_CLICK_RUNTIME" as const;
