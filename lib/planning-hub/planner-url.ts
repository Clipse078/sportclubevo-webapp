/**
 * PLANNING-HUB-01 — URL state for the unified Wochenplaner shell.
 * Keeps week, perspective, and filters in the query string for back/forward navigation.
 */

export type PlanningHubPerspective = "woche" | "ressourcen";

export type PlanningHubActivityFilter =
  | "alle"
  | "trainings"
  | "spiele"
  | "turniere"
  | "veranstaltungen";

export type PlanningHubUrlState = {
  week?: string;
  plan?: string;
  perspective: PlanningHubPerspective;
  activity: PlanningHubActivityFilter;
  team: string | null;
  facility: string | null;
  conflictsOnly: boolean;
  resourceCategory: "pitch" | "dressing";
};

const BASE_PATH = "/dashboard/planner/week";

export function parsePlanningHubUrlState(
  params: Record<string, string | undefined>,
): PlanningHubUrlState {
  const perspective = params.ansicht === "ressourcen" ? "ressourcen" : "woche";
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
    activity,
    team: params.team?.trim() || null,
    facility: params.facility?.trim() || null,
    conflictsOnly: params.konflikte === "1",
    resourceCategory: params.ressource === "garderobe" ? "dressing" : "pitch",
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
  if (merged.activity !== "alle") query.set("typ", merged.activity);
  if (merged.team) query.set("team", merged.team);
  if (merged.facility) query.set("facility", merged.facility);
  if (merged.conflictsOnly) query.set("konflikte", "1");
  if (merged.perspective === "ressourcen" && merged.resourceCategory === "dressing") {
    query.set("ressource", "garderobe");
  }

  const qs = query.toString();
  return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
}
