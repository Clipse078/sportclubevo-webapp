/**
 * PLANNING-HUB-02E — client-side `zeit` URL sync without RSC navigation.
 * Pure helpers (testable without a browser).
 */

import {
  defaultDaypartForLocalTime,
  parsePlanningHubCalendarZeitParam,
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
  const parsed = parsePlanningHubCalendarZeitParam(raw);
  if (parsed) return parsed;
  const now = options?.now ?? new Date();
  const timeZone = options?.timeZone ?? "Europe/Zurich";
  return defaultDaypartForLocalTime(now, timeZone);
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
  return buildPlanningHubHref(base, { calendarZeit });
}
