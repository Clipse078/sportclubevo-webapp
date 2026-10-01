/**
 * Bounded horizon for attendance obligations in the PersonalAction read model.
 *
 * Rationale: mirrors personal-agenda / participation “upcoming” semantics without
 * scanning a full season. Ninety days covers typical match/training planning windows
 * while keeping batched event queries predictable.
 */
export const PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS = 90;

/**
 * Dashboard hot path: caps upcoming session/event rows loaded before in-memory
 * participation join. Full inbox (no actionableItemCap) keeps horizon completeness.
 */
export function resolveDashboardAttendanceEventFetchCap(actionableCap: number): number {
  return Math.min(400, Math.max(actionableCap * 8, 80));
}

/**
 * Completeness contract: attendance obligations are bounded only by
 * {@link PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS} and canonical upcoming
 * `startAt >= now` semantics. We do not truncate per team season, because
 * dense training schedules (e.g. 3×/week) can exceed naive row caps inside
 * 90 days and would silently drop actionable participation items.
 */
