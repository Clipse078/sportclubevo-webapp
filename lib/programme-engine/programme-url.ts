import type { ProgrammeActivityKind, ProgrammeFilters, ProgrammeTemporalMode } from "./types";
import { PROGRAMME_ACTIVITY_KINDS } from "./types";

export type ProgrammeViewMode = "liste" | "kalender";

export type ProgrammeUrlState = {
  view: ProgrammeViewMode;
  temporal: ProgrammeTemporalMode;
  month?: string;
  teamIds: string[];
  orgUnitIds: string[];
  activityKinds: ProgrammeActivityKind[];
};

const VIEW_VALUES = new Set<ProgrammeViewMode>(["liste", "kalender"]);
const TEMPORAL_VALUES = new Set<ProgrammeTemporalMode>(["upcoming", "past", "range"]);

function parseCsvIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseActivityKinds(raw: string | undefined): ProgrammeActivityKind[] {
  if (!raw?.trim()) return [];
  const allowed = new Set<string>(PROGRAMME_ACTIVITY_KINDS);
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((k): k is ProgrammeActivityKind => allowed.has(k));
}

export function parseProgrammeUrlState(
  params: Record<string, string | string[] | undefined>,
): ProgrammeUrlState {
  const viewRaw = typeof params.ansicht === "string" ? params.ansicht : undefined;
  const view: ProgrammeViewMode = viewRaw && VIEW_VALUES.has(viewRaw as ProgrammeViewMode)
    ? (viewRaw as ProgrammeViewMode)
    : "liste";

  const temporalRaw = typeof params.zeitraum === "string" ? params.zeitraum : undefined;
  let temporal: ProgrammeTemporalMode = "upcoming";
  if (temporalRaw === "vergangen") temporal = "past";
  else if (temporalRaw === "bereich") temporal = "range";
  else if (temporalRaw && TEMPORAL_VALUES.has(temporalRaw as ProgrammeTemporalMode)) {
    temporal = temporalRaw as ProgrammeTemporalMode;
  }

  const month = typeof params.monat === "string" && /^\d{4}-\d{2}$/.test(params.monat)
    ? params.monat
    : undefined;

  return {
    view,
    temporal,
    month,
    teamIds: parseCsvIds(typeof params.teams === "string" ? params.teams : undefined),
    orgUnitIds: parseCsvIds(typeof params.org === "string" ? params.org : undefined),
    activityKinds: parseActivityKinds(typeof params.typ === "string" ? params.typ : undefined),
  };
}

export function programmeFiltersFromUrlState(state: ProgrammeUrlState): ProgrammeFilters {
  return {
    teamIds: state.teamIds.length > 0 ? state.teamIds : undefined,
    orgUnitIds: state.orgUnitIds.length > 0 ? state.orgUnitIds : undefined,
    activityKinds: state.activityKinds.length > 0 ? state.activityKinds : undefined,
  };
}

export function buildProgrammeHref(
  basePath: string,
  current: ProgrammeUrlState,
  patch: Partial<ProgrammeUrlState>,
): string {
  const next: ProgrammeUrlState = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.view !== "liste") params.set("ansicht", next.view);
  if (next.temporal === "past") params.set("zeitraum", "vergangen");
  else if (next.temporal === "range") params.set("zeitraum", "bereich");
  if (next.month) params.set("monat", next.month);
  if (next.teamIds.length > 0) params.set("teams", next.teamIds.join(","));
  if (next.orgUnitIds.length > 0) params.set("org", next.orgUnitIds.join(","));
  if (next.activityKinds.length > 0) params.set("typ", next.activityKinds.join(","));

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
