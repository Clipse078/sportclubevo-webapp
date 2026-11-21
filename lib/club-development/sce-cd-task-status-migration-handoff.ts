/**
 * PR #1018 — TaskStatus::WAITING migration checksums (shared STAGE recorded values).
 */

export const SCE_CD_TASK_STATUS_WAITING_MIGRATION =
  "20261120150000_sce_cd_task_status_waiting" as const;

/** Recorded STAGE checksum for the initial enum append (applied 2026-11-20). */
export const SCE_CD_TASK_STATUS_WAITING_CHECKSUM_SHA256 =
  "67e8fe66e3f9eaa351d6ad103a5905fa51d1a83acd6d330bde2ae8b33437b2bb";

export const SCE_CD_TASK_STATUS_WAITING_ENSURE_MIGRATION =
  "20261120150100_sce_cd_task_status_waiting_ensure" as const;

export const SCE_CD_TASK_STATUS_WAITING_ENSURE_CHECKSUM_SHA256 =
  "2aedade766002846e25f3f3b1de80a63818922706e0c4fd3140afbac9d4643ba";

export const SCE_CD_TASK_STATUS_MIGRATION_ORDER = [
  SCE_CD_TASK_STATUS_WAITING_MIGRATION,
  SCE_CD_TASK_STATUS_WAITING_ENSURE_MIGRATION,
] as const;