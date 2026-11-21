/**
 * PO-facing rollout order for TaskStatus::WAITING (PR #1018).
 *
 * Shared STAGE already has both migrations applied (fingerprint acd3b37682911890).
 * Merge gate is application-only — do not run APPLY_DATABASE_MIGRATIONS for WAITING on STAGE.
 */

import {
  SCE_CD_TASK_STATUS_WAITING_ENSURE_MIGRATION,
  SCE_CD_TASK_STATUS_WAITING_MIGRATION as SCE_CD_TASK_STATUS_WAITING_INITIAL_MIGRATION,
} from "@/lib/club-development/sce-cd-task-status-migration-handoff";

/** Guarded deploy target when schema is not yet applied (ensure plpgsql idempotent path). */
export const SCE_CD_TASK_STATUS_WAITING_MIGRATION = SCE_CD_TASK_STATUS_WAITING_ENSURE_MIGRATION;

/** Recorded on shared STAGE before ensure migration (simple IF NOT EXISTS append). */
export const SCE_CD_TASK_STATUS_WAITING_MIGRATION_LEGACY =
  SCE_CD_TASK_STATUS_WAITING_INITIAL_MIGRATION;

/**
 * Release order after explicit PO approval (shared STAGE):
 * 1. Merge PR #1018 → STAGE and deploy sportclubevo-webapp-stage (no APPLY_DATABASE_MIGRATIONS).
 * 2. PO saves Wartet only after canonical STAGE serves the WAITING-capable app build.
 * 3. Rollback requires a WAITING-capable app while rows exist, or approved data conversion.
 */
export const SCE_CD_TASK_STATUS_ROLLOUT_STEPS = [
  "PO approval → merge #1018 → STAGE; deploy application only (migrations already on shared STAGE).",
  "PO manual UAT on PR Ready preview, then on canonical STAGE after deploy.",
  "PO may persist Wartet only after canonical STAGE runs the #1018 app (enum already in DB).",
  "Rollback: keep a WAITING-capable app or approved row conversion — not pre-#1018 STAGE app.",
] as const;