/**
 * SCE-DASHBOARD-V3-03 — Personal dashboard hero image persistence adapter.
 *
 * PROPOSED SCHEMA (awaiting migration approval — do NOT apply without sign-off):
 *   model User {
 *     ...
 *     /// Personal dashboard cover image URL (Vercel Blob). Distinct from Person.imageUrl avatar.
 *     dashboardHeroImageUrl      String?
 *     /// Cover zoom multiplier on top of object-cover minimum (>= 1).
 *     dashboardHeroImageZoom     Float?
 *     /// Normalized horizontal focal point (0..1).
 *     dashboardHeroImagePositionX Float?
 *     /// Normalized vertical focal point (0..1).
 *     dashboardHeroImagePositionY Float?
 *   }
 *
 * Until the migration lands, reads return null and writes are skipped after blob upload.
 */

export const DASHBOARD_HERO_SCHEMA_FIELD = "dashboardHeroImageUrl" as const;
export const DASHBOARD_HERO_ZOOM_FIELD = "dashboardHeroImageZoom" as const;
export const DASHBOARD_HERO_POSITION_X_FIELD = "dashboardHeroImagePositionX" as const;
export const DASHBOARD_HERO_POSITION_Y_FIELD = "dashboardHeroImagePositionY" as const;

export function getDashboardHeroStorageKey(userId: string, ext: string): string {
  return `dashboard-hero/${userId}.${ext}`;
}

/**
 * Resolve the authenticated user's persisted dashboard hero URL.
 * Returns null until User.dashboardHeroImageUrl exists in the database.
 */
export async function getUserDashboardHeroImageUrl(userId: string): Promise<string | null> {
  if (!userId) return null;

  // After migration + prisma generate, replace with prisma.user.findUnique(...)
  return null;
}

export type PersistDashboardHeroResult =
  | { ok: true; persisted: true }
  | { ok: true; persisted: false; reason: "schema_migration_pending" }
  | { ok: false; error: string };

/**
 * Persist the uploaded hero URL on the User record.
 * Skips DB write until migration is approved (blob upload still succeeds).
 */
export async function persistUserDashboardHeroImageUrl(
  userId: string,
  imageUrl: string | null,
): Promise<PersistDashboardHeroResult> {
  void userId;
  void imageUrl;
  return {
    ok: true,
    persisted: false,
    reason: "schema_migration_pending",
  };
}
