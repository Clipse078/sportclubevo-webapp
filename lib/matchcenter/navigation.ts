/**
 * lib/matchcenter/navigation.ts
 *
 * Shared URL builders and team-filter normalization for Matchcenter overview
 * navigation (tabs, month, status, wochenplan, team).
 */

import type {
  MatchcenterActionFilter,
  MatchcenterTab,
  MatchcenterWochenplanFilter,
} from "./view-model";

export type MatchcenterTeamOption = {
  id: string;
  label: string;
};

export type SpieleHomeAwayFilter = "ALLE" | "HOME" | "AWAY";
export type SpieleListView = "LISTE" | "KOMPAKT" | "KALENDER";
export type SpieleStatusMaskKey = "anstehend" | "offen" | "bereit" | "abgesagt";

export type MatchcenterHrefParams = {
  tab: MatchcenterTab;
  month: string;
  actionFilter: MatchcenterActionFilter;
  wochenplanFilter: MatchcenterWochenplanFilter;
  teamFilter?: string | null;
  search?: string | null;
  sort?: string | null;
  homeAwayFilter?: SpieleHomeAwayFilter;
  listView?: SpieleListView;
  competitionFilter?: string | null;
  venueFilter?: string | null;
  /** Comma-separated readiness buckets; omitted when default (all except abgesagt). */
  statusMask?: readonly SpieleStatusMaskKey[] | null;
};

const DEFAULT_STATUS_MASK: SpieleStatusMaskKey[] = [
  "anstehend",
  "offen",
  "bereit",
];

export function normalizeSpieleHomeAwayFilter(
  value: string | null | undefined,
): SpieleHomeAwayFilter {
  const v = value?.trim().toLowerCase() ?? "";
  if (v === "heim" || v === "home") return "HOME";
  if (v === "auswaerts" || v === "auswärts" || v === "away") return "AWAY";
  return "ALLE";
}

export function normalizeSpieleListView(
  value: string | null | undefined,
): SpieleListView {
  const v = value?.trim().toLowerCase() ?? "";
  if (v === "kompakt") return "KOMPAKT";
  if (v === "kalender") return "KALENDER";
  return "LISTE";
}

export function normalizeSpieleStatusMask(
  statusParam: string | null | undefined,
  actionFilter: MatchcenterActionFilter,
): SpieleStatusMaskKey[] {
  const raw = statusParam?.trim();
  if (raw) {
    const parts = raw
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    const allowed = new Set<SpieleStatusMaskKey>([
      "anstehend",
      "offen",
      "bereit",
      "abgesagt",
    ]);
    const picked = parts.filter((p): p is SpieleStatusMaskKey =>
      allowed.has(p as SpieleStatusMaskKey),
    );
    if (picked.length > 0) return picked;
  }

  if (actionFilter === "OFFEN") return ["offen"];
  if (actionFilter === "ERLEDIGT") return ["bereit"];
  return [...DEFAULT_STATUS_MASK];
}

export function statusMaskToActionFilter(
  mask: readonly SpieleStatusMaskKey[],
): MatchcenterActionFilter {
  const set = new Set(mask);
  const hasOffen = set.has("offen");
  const hasBereit = set.has("bereit");
  const hasAnstehend = set.has("anstehend");
  if (hasOffen && !hasBereit && !hasAnstehend) return "OFFEN";
  if (hasBereit && !hasOffen && !hasAnstehend) return "ERLEDIGT";
  return "ALLE";
}

function serializeStatusMask(mask: readonly SpieleStatusMaskKey[] | null | undefined): string | null {
  if (!mask || mask.length === 0) return null;
  const sorted = [...new Set(mask)].sort();
  const defaultSet = [...DEFAULT_STATUS_MASK].sort();
  if (sorted.join(",") === defaultSet.join(",")) return null;
  return sorted.join(",");
}

/**
 * Builds a bookmarkable Matchcenter overview href. Omits default query values
 * (ALLE filters, no team) to keep URLs minimal.
 */
export function buildMatchcenterHref(
  basePath: string,
  params: MatchcenterHrefParams,
): string {
  const search = new URLSearchParams();
  search.set("tab", params.tab.toLowerCase());
  search.set("month", params.month);

  if (params.tab === "SPIELPLANUNG") {
    const mask = params.statusMask ?? null;
    const serializedMask = serializeStatusMask(mask);
    if (serializedMask) {
      search.set("status", serializedMask);
      search.set("filter", statusMaskToActionFilter(mask ?? DEFAULT_STATUS_MASK).toLowerCase());
    } else {
      search.set("filter", params.actionFilter.toLowerCase());
    }
  }

  if (params.homeAwayFilter && params.homeAwayFilter !== "ALLE") {
    search.set(
      "ha",
      params.homeAwayFilter === "HOME" ? "heim" : "auswaerts",
    );
  }

  if (params.listView && params.listView !== "LISTE") {
    search.set("view", params.listView.toLowerCase());
  }

  if (params.competitionFilter?.trim()) {
    search.set("competition", params.competitionFilter.trim());
  }

  if (params.venueFilter?.trim()) {
    search.set("venue", params.venueFilter.trim());
  }

  if (params.wochenplanFilter !== "ALLE") {
    search.set("wochenplan", params.wochenplanFilter.toLowerCase());
  }

  if (params.teamFilter) {
    search.set("team", params.teamFilter);
  }

  const q = params.search?.trim();
  if (q) {
    search.set("q", q);
  }

  const sort = params.sort?.trim();
  if (sort && sort.toUpperCase() !== "KICKOFF_ASC") {
    search.set("sort", sort.toLowerCase());
  }

  return `${basePath}?${search.toString()}`;
}

/**
 * Resolves the `team` query param against tenant-scoped canonical team ids.
 * Unknown or cross-tenant ids are ignored (Alle Teams).
 */
export function normalizeMatchcenterTeamFilter(
  value: string | null | undefined,
  validTeamIds: ReadonlySet<string>,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  return validTeamIds.has(trimmed) ? trimmed : null;
}

export function toMatchcenterTeamOptions(
  teams: ReadonlyArray<{
    id: string;
    compactName: string | null;
    displayName?: string | null;
    name?: string | null;
  }>,
): MatchcenterTeamOption[] {
  return teams.map((team) => ({
    id: team.id,
    label: team.compactName ?? team.displayName ?? team.name ?? team.id,
  }));
}
