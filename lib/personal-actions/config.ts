/**
 * Bounded horizon for attendance obligations in the PersonalAction read model.
 *
 * Rationale: mirrors personal-agenda / participation “upcoming” semantics without
 * scanning a full season. Ninety days covers typical match/training planning windows
 * while keeping batched event queries predictable.
 */
export const PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS = 90;

/** Safety cap per team season when loading calendar/training rows inside the horizon. */
export const PERSONAL_ACTION_MAX_UPCOMING_EVENTS_PER_TEAM_SEASON = 25;
