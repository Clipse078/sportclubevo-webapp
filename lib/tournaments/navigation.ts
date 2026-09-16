/**
 * lib/tournaments/navigation.ts
 *
 * TOURNAMENT-CENTER-UX-01 — bookmarkable URL builders and param normalization
 * for the Tournament Center operations workspace.
 */

import type { TournamentStatus } from "./types";
import type { TournamentActionFilter } from "./view-model";
import {
  normalizeTournamentTimeScope,
  type TournamentGroupMode,
  type TournamentSortMode,
  type TournamentTimeScope,
} from "./workspace-view-model";

export { normalizeTournamentActionFilter } from "./view-model";

export type TournamentTeamOption = {
  id: string;
  label: string;
};

export type TournamentCenterHrefParams = {
  scope: TournamentTimeScope;
  search?: string;
  teamFilter?: string | null;
  month?: string | null;
  statusFilter?: TournamentStatus | null;
  actionFilter?: TournamentActionFilter;
  group?: TournamentGroupMode;
  sort?: TournamentSortMode;
};

const VALID_STATUSES = new Set<TournamentStatus>([
  "DRAFT",
  "SCHEDULED",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
  "POSTPONED",
  "ARCHIVED",
]);

export function normalizeTournamentStatusFilter(
  value: string | null | undefined,
): TournamentStatus | null {
  const upper = value?.trim().toUpperCase() ?? "";
  if (!upper) {
    return null;
  }
  return VALID_STATUSES.has(upper as TournamentStatus) ? (upper as TournamentStatus) : null;
}

export function normalizeTournamentTeamFilter(
  value: string | null | undefined,
  validTeamIds: ReadonlySet<string>,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return validTeamIds.has(trimmed) ? trimmed : null;
}

export function toTournamentTeamOptions(
  teams: ReadonlyArray<{
    id: string;
    compactName: string | null;
    displayName?: string | null;
    name?: string | null;
  }>,
): TournamentTeamOption[] {
  return teams
    .map((team) => ({
      id: team.id,
      label: team.compactName ?? team.displayName ?? team.name ?? team.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "de"));
}

/**
 * Legacy `tab=anstehend|archiv` → scope. Prefer explicit `scope` when present.
 */
export function resolveTournamentTimeScopeFromParams(params: {
  scope?: string | null;
  tab?: string | null;
}): TournamentTimeScope {
  if (params.scope?.trim()) {
    return normalizeTournamentTimeScope(params.scope);
  }

  const tab = params.tab?.trim().toUpperCase();
  if (tab === "ARCHIV") {
    return "PAST";
  }
  if (tab === "ALL" || tab === "ALLE") {
    return "ALL";
  }
  return "UPCOMING";
}

export function buildTournamentCenterHref(
  basePath: string,
  params: TournamentCenterHrefParams,
): string {
  const search = new URLSearchParams();

  if (params.scope !== "UPCOMING") {
    search.set("scope", params.scope.toLowerCase());
  }

  const q = params.search?.trim();
  if (q) {
    search.set("q", q);
  }

  if (params.teamFilter) {
    search.set("team", params.teamFilter);
  }

  if (params.month) {
    search.set("month", params.month);
  }

  if (params.statusFilter) {
    search.set("status", params.statusFilter.toLowerCase());
  }

  const actionFilter = params.actionFilter ?? "ALLE";
  if (params.scope === "UPCOMING" && actionFilter !== "ALLE") {
    search.set("filter", actionFilter.toLowerCase());
  }

  const group = params.group ?? "DATE";
  if (group !== "DATE") {
    search.set("group", group.toLowerCase());
  }

  const sort = params.sort ?? "DATE_ASC";
  if (sort !== "DATE_ASC") {
    search.set("sort", sort.toLowerCase());
  }

  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function hasActiveTournamentWorkspaceFilters(params: {
  search?: string;
  teamFilter?: string | null;
  month?: string | null;
  statusFilter?: TournamentStatus | null;
  actionFilter?: TournamentActionFilter;
}): boolean {
  return Boolean(
    params.search?.trim() ||
      params.teamFilter ||
      params.month ||
      params.statusFilter ||
      (params.actionFilter && params.actionFilter !== "ALLE"),
  );
}

export function buildTournamentCenterResetHref(
  basePath: string,
  scope: TournamentTimeScope,
  group: TournamentGroupMode,
): string {
  return buildTournamentCenterHref(basePath, {
    scope,
    group,
    actionFilter: "ALLE",
  });
}