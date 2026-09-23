/**
 * WORKSPACE-08-03 — explicit trash retention defaults (days).
 *
 * Discovery benchmark (WORKSPACE-08D): 60-day default for club business documents.
 * Tenant override via WorkspaceTrashRetentionPolicy.trashRetentionDays.
 */

/** Platform default when no tenant policy row exists. */
export const WORKSPACE_DEFAULT_TRASH_RETENTION_DAYS = 60;

export const WORKSPACE_MIN_TRASH_RETENTION_DAYS = 30;
export const WORKSPACE_MAX_TRASH_RETENTION_DAYS = 180;

export function normalizeTrashRetentionDays(raw: number): number | null {
  if (!Number.isFinite(raw)) {
    return null;
  }
  const rounded = Math.floor(raw);
  if (
    rounded < WORKSPACE_MIN_TRASH_RETENTION_DAYS ||
    rounded > WORKSPACE_MAX_TRASH_RETENTION_DAYS
  ) {
    return null;
  }
  return rounded;
}

export function computeTrashPurgeEligibleAt(
  trashedAt: Date,
  retentionDays: number,
): Date {
  return new Date(trashedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}

export function isTrashRetentionExpired(
  trashedAt: Date,
  retentionDays: number,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= computeTrashPurgeEligibleAt(trashedAt, retentionDays).getTime();
}
