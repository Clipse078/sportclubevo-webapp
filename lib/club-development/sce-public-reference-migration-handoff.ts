/**
 * PR #1021 — SCE public reference migration chain (read-only metadata for verifiers).
 */

export const SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION =
  "20261121133000_sce_public_reference_foundation" as const;

/** Recorded STAGE checksum for tenant-scoped foundation (commit afa97bf55). */
export const SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256 =
  "a43064fa3b2059ff266b80ce8f41d449d0791a876abfd76ae634153727972f27";

export const SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION_MIGRATION =
  "20261121135000_sce_public_reference_global_conversion" as const;

export const SCE_PUBLIC_REFERENCE_BIGINT_MIGRATION =
  "20261121140000_sce_public_reference_bigint" as const;

export const SCE_PUBLIC_REFERENCE_MIGRATION_ORDER = [
  SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION,
  SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION_MIGRATION,
  SCE_PUBLIC_REFERENCE_BIGINT_MIGRATION,
] as const;