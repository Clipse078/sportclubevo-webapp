/**
 * FIN-06D — documented sharing security decisions (architecture + tests).
 */

export const FINANCE_PUBLICATION_SHARE_TOKEN_ENTROPY_BYTES = 32;

export const FINANCE_PUBLICATION_SHARE_SECURITY = {
  R1_MODEL:
    "32-byte random URL segment; SHA-256 digest persisted; raw segment shown once; no DB recovery",
  R2_MODEL:
    "32-byte random opaque publicToken persisted as capability URL segment; server record holds revocation/expiry authority",
  WHY_CHANGED:
    "One-click reuse requires authorized internal link reconstruction without storing a separate recoverable password-like secret",
  PUBLIC_IDENTIFIER_ENTROPY: "32 bytes from crypto.randomBytes, base64url (~256 bits)",
  ENUMERATION_RESISTANCE:
    "Opaque high-entropy publicToken; generic unavailable UX for invalid/revoked/expired; no sequential public IDs",
  DATABASE_EXPOSURE_RISK:
    "publicToken in DB is the capability identifier (like an unlisted doc link), not an internal password; protect DB access as for all secrets",
  LOGGING_POLICY:
    "No share URL segments in logs, audit metadata, or analytics; audit records share id + version only",
  ANALYTICS_POLICY: "No share capability identifiers in product analytics payloads",
  REVOCATION_AUTHORITY: "Server-side revokedAt on FinancePublicationShare; immediate external denial",
  EXPIRY_AUTHORITY: "Server-side expiresAt on FinancePublicationShare",
  LINK_RECONSTRUCTION_METHOD:
    "Authorized users: load active DEFAULT share publicToken for version; construct /share/finance/publication/{publicToken}",
  RAW_SECRET_PLAINTEXT_STORAGE:
    "false — no separate hidden raw secret; publicToken is the designed opaque capability identifier",
  LEGACY_R1_RESOLUTION:
    "URL segment hashed to tokenHash for rows created before publicToken persistence",
  RATE_LIMITING_DECISION:
    "checkApplicationRateLimit on public share view + PDF routes (best-effort in-process; not distributed)",
} as const;

/** @deprecated use FINANCE_PUBLICATION_SHARE_SECURITY fields */
export const FINANCE_PUBLICATION_SHARE_SECURITY_LEGACY = {
  TOKEN_ENTROPY: FINANCE_PUBLICATION_SHARE_SECURITY.PUBLIC_IDENTIFIER_ENTROPY,
  ENUMERATION_RESISTANCE: FINANCE_PUBLICATION_SHARE_SECURITY.ENUMERATION_RESISTANCE,
  RAW_TOKEN_PERSISTENCE: "R1: NEVER — superseded by R2 publicToken capability model",
  RATE_LIMITING_DECISION: FINANCE_PUBLICATION_SHARE_SECURITY.RATE_LIMITING_DECISION,
  LOGGING_DECISION: FINANCE_PUBLICATION_SHARE_SECURITY.LOGGING_POLICY,
} as const;
