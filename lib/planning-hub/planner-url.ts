/**
 * PLANNING-HUB-01 — URL state for the unified Wochenplaner shell.
 * PLANNING-HUB-01B — Kalender (default) · Ressourcen · Liste
 */

export type PlanningHubPerspective = "kalender" | "ressourcen" | "liste";

export type PlanningHubActivityFilter =
  | "alle"
  | "trainings"
  | "spiele"
  | "turniere"
  | "veranstaltungen";

export type PlanningHubCalendarTimeRange = "focused" | "full";

export type PlanningHubUrlState = {
  week?: string;
  plan?: string;
  perspective: PlanningHubPerspective;
  /** Selected calendar day for Ressourcen (`YYYY-MM-DD`). */
  day?: string;
  activity: PlanningHubActivityFilter;
  team: string | null;
  facility: string | null;
  conflictsOnly: boolean;
  resourceCategory: "pitch" | "dressing";
  /** Kalender vertical range: focused operational window vs full activity span. */
  calendarTimeRange: PlanningHubCalendarTimeRange;
};

const BASE_PATH = "/dashboard/planner/week";

function parsePerspective(raw: string | undefined): PlanningHubPerspective {
  const value = raw?.trim().toLowerCase();
  if (value === "ressourcen") return "ressourcen";
  if (value === "liste" || value === "woche") return "liste";
  if (value === "kalender") return "kalender";
  return "kalender";
}

export function parsePlanningHubUrlState(
  params: Record<string, string | undefined>,
): PlanningHubUrlState {
  const perspective = parsePerspective(params.ansicht);
  const activityRaw = params.typ?.toLowerCase();
  const activity: PlanningHubActivityFilter =
    activityRaw === "trainings" ||
    activityRaw === "spiele" ||
    activityRaw === "turniere" ||
    activityRaw === "veranstaltungen"
      ? activityRaw
      : "alle";

  return {
    week: params.week?.trim() || undefined,
    plan: params.plan?.trim() || undefined,
    perspective,
    day: params.day?.trim() || undefined,
    activity,
    team: params.team?.trim() || null,
    facility: params.facility?.trim() || null,
    conflictsOnly: params.konflikte === "1",
    resourceCategory: params.ressource === "garderobe" ? "dressing" : "pitch",
    calendarTimeRange: params.zeit === "ganz" ? "full" : "focused",
  };
}

export function buildPlanningHubHref(
  state: PlanningHubUrlState,
  patch: Partial<PlanningHubUrlState> = {},
): string {
  const merged: PlanningHubUrlState = { ...state, ...patch };
  const query = new URLSearchParams();

  if (merged.week) query.set("week", merged.week);
  if (merged.plan) query.set("plan", merged.plan);
  if (merged.perspective === "ressourcen") query.set("ansicht", "ressourcen");
  else if (merged.perspective === "liste") query.set("ansicht", "liste");
  if (merged.perspective === "ressourcen" && merged.day) query.set("day", merged.day);
  if (merged.activity !== "alle") query.set("typ", merged.activity);
  if (merged.team) query.set("team", merged.team);
  if (merged.facility) query.set("facility", merged.facility);
  if (merged.conflictsOnly) query.set("konflikte", "1");
  if (merged.perspective === "ressourcen" && merged.resourceCategory === "dressing") {
    query.set("ressource", "garderobe");
  }
  if (merged.calendarTimeRange === "full") query.set("zeit", "ganz");

  const qs = query.toString();
  return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
}

/** Picks the Ressourcen day: URL `day` if in week, else today if in week, else Monday. */
export function resolvePlanningHubResourceDay(
  weekDayKeys: readonly string[],
  urlDay: string | undefined,
  todayDayKey: string,
): string {
  if (weekDayKeys.length === 0) return todayDayKey;
  if (urlDay && weekDayKeys.includes(urlDay)) return urlDay;
  if (weekDayKeys.includes(todayDayKey)) return todayDayKey;
  return weekDayKeys[0]!;
}
