/**
 * FIN-06D — documented sharing security decisions (architecture + tests).
 */

export const FINANCE_PUBLICATION_SHARE_TOKEN_ENTROPY_BYTES = 32;

export const FINANCE_PUBLICATION_SHARE_SECURITY = {
  TOKEN_ENTROPY: "32 bytes from crypto.randomBytes, base64url (~256 bits)",
  ENUMERATION_RESISTANCE:
    "Opaque high-entropy token; SHA-256 digest stored; generic unavailable UX for invalid/revoked/expired",
  RAW_TOKEN_PERSISTENCE:
    "NEVER — raw token returned once at creation only; link cannot be recovered from storage",
  RATE_LIMITING_DECISION:
    "checkApplicationRateLimit on public share view + PDF routes (defense-in-depth; see abuse-policy)",
  LOGGING_DECISION:
    "No raw tokens in logs, audit metadata, or analytics; audit records share id + version only",
} as const;
