/**
 * PO-facing rollout order for TaskStatus::WAITING (follow-up PR, not #1017 RC).
 * No automated apply — platform approval required.
 */

export const SCE_CD_TASK_STATUS_WAITING_MIGRATION = "20261120150100_sce_cd_task_status_waiting_ensure" as const;

/** Earlier migration id may be marked applied without enum value — ensure uses plpgsql helper. */
export const SCE_CD_TASK_STATUS_WAITING_MIGRATION_LEGACY = "20261120150000_sce_cd_task_status_waiting" as const;

/**
 * Recommended order (shared STAGE / production):
 * 1. Deploy app build that tolerates unknown enum values on read (this follow-up branch).
 * 2. Run `20261120150100_sce_cd_task_status_waiting_ensure` on the target database.
 * 3. Smoke: create/move one task to Wartet; verify board column + list/detail label.
 * 4. Rollback app only: WAITING rows remain valid in DB; older app without WAITING in Prisma must not be deployed against DB that has WAITING values.
 */
export const SCE_CD_TASK_STATUS_ROLLOUT_STEPS = [
  "Deploy follow-up application build (includes WAITING in Prisma client and VE status UI).",
  `Apply database migration ${SCE_CD_TASK_STATUS_WAITING_MIGRATION} (ensure enum value exists).`,
  "Verify Aufgaben list, detail, Ungeplant, and Umsetzungsphase board show Wartet.",
  "Rollback: revert app first; do not remove enum value from Postgres without data migration.",
] as const;