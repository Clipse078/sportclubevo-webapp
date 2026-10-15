import type { ProgrammeFilters, ProgrammeItem } from "./types";

function matchesActivityKind(
  item: ProgrammeItem,
  kinds: readonly ProgrammeItem["kind"][] | undefined,
): boolean {
  if (!kinds || kinds.length === 0) return true;
  return kinds.includes(item.kind);
}

function matchesTeamIds(item: ProgrammeItem, teamIds: readonly string[] | undefined): boolean {
  if (!teamIds || teamIds.length === 0) return true;
  if (!item.teamId) return false;
  return teamIds.includes(item.teamId);
}

function matchesOrgUnitIds(
  item: ProgrammeItem,
  orgUnitIds: readonly string[] | undefined,
): boolean {
  if (!orgUnitIds || orgUnitIds.length === 0) return true;
  if (!item.orgUnitId) return false;
  return orgUnitIds.includes(item.orgUnitId);
}

function matchesStatuses(
  item: ProgrammeItem,
  statuses: readonly string[] | undefined,
): boolean {
  if (!statuses || statuses.length === 0) return true;
  if (!item.status) return false;
  return statuses.includes(item.status);
}

export function applyProgrammeFilters(
  items: ProgrammeItem[],
  filters: ProgrammeFilters | undefined,
): ProgrammeItem[] {
  if (!filters) return items;
  return items.filter(
    (item) =>
      matchesActivityKind(item, filters.activityKinds) &&
      matchesTeamIds(item, filters.teamIds) &&
      matchesOrgUnitIds(item, filters.orgUnitIds) &&
      matchesStatuses(item, filters.statuses),
  );
}
