import { cn } from "@/lib/cn";

/**
 * Shared SCE activity-card semantic foregrounds (Match / Training / Tournament).
 * Consume these from density scale modules — do not invent parallel color-mix values in cards.
 */

/** Primary club/title names — applied via density `*NameClass` / `titleClass` tokens. */
export const SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS =
  "text-[var(--sce-color-text-primary)]";

/** Competition (match), organiser (tournament), quiet list context. */
export const SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS =
  "text-[var(--sce-color-text-secondary)]";

/** Calendar/clock schedule lines — date and time share this hierarchy. */
export const SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS =
  "text-[var(--sce-color-text-secondary)]";

/** Team/participant context (Hauptteam, training team emphasis). */
export const SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS =
  "text-[var(--sce-activity-card-team-context-foreground)]";

/** Venue/resource location — icon + text. */
export const SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS =
  "text-[var(--sce-activity-card-location-foreground)]";

/** Intentionally subordinate fixture separator (VS). */
export const SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS = "text-[var(--muted)]";

export function sceActivityLocationTextClass(baseScheduleTextClass: string): string {
  return cn(baseScheduleTextClass, SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS);
}

export function sceActivityLocationIconClass(baseScheduleIconClass: string): string {
  return cn(baseScheduleIconClass, SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS);
}
