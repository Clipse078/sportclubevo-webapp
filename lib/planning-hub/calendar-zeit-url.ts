/**
 * PLANNING-HUB-02E — client-side `zeit` URL sync without RSC navigation.
 * Pure helpers (testable without a browser).
 */

import {
  normalizeInvalidCalendarZeit,
  type PlanningHubCalendarZeitParam,
} from "./planning-dayparts";
import { buildPlanningHubHref, type PlanningHubUrlState } from "./planner-url";

export function readCalendarZeitFromSearch(
  search: string,
  options?: { now?: Date; timeZone?: string },
): PlanningHubCalendarZeitParam | undefined {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = params.get("zeit");
  if (!raw?.trim()) return undefined;
  return normalizeInvalidCalendarZeit(
    raw,
    options?.now ?? new Date(),
    options?.timeZone ?? "Europe/Zurich",
  );
}

export function mergeCalendarZeitIntoUrlState(
  base: PlanningHubUrlState,
  calendarZeit: PlanningHubCalendarZeitParam | undefined,
): PlanningHubUrlState {
  return { ...base, calendarZeit };
}

export function hrefForCalendarZeit(
  base: PlanningHubUrlState,
  calendarZeit: PlanningHubCalendarZeitParam,
): string {
  const canonical =
    calendarZeit === "ganz" ? undefined : calendarZeit;
  return buildPlanningHubHref(base, { calendarZeit: canonical });
}
