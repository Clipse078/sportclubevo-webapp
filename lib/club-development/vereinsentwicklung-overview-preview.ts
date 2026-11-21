import "server-only";

import type { ClubStrategyListItemDto } from "./club-strategy-service";
import { listClubStrategies } from "./club-strategy-service";
import type { StrategyTargetOverview } from "./strategy-overview";
import { loadStrategyOverview } from "./strategy-overview";
import type { ActorContext } from "@/lib/visibility/actor-context";
import type { TargetListItem } from "@/lib/targets/queries";
import type { VereinsentwicklungOrgEinheitFilter } from "./vereinsentwicklung-workspace-org-filter";
import {
  filterTargetsForOrgEinheit,
} from "./vereinsentwicklung-leadership-dashboard";
import { loadVorhabenWorkspace, type VorhabenWorkspaceTaskRow } from "./vorhaben-workspace";
import { buildUebersichtHref, canAccessConnectedView } from "./vereinsentwicklung-connected-workspace";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "./vereinsentwicklung-connected-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { hasSprintManagePermission } from "./sprints/queries";

export const VEREINSENTWICKLUNG_OVERVIEW_PREVIEW_LIMIT = 3;

export type VereinsentwicklungOverviewSortable = {
  createdAt: string;
  id: string;
};

/** Newest first; stable tie-breaker on id ascending. */
export function compareVereinsentwicklungOverviewNewestFirst(
  a: VereinsentwicklungOverviewSortable,
  b: VereinsentwicklungOverviewSortable,
): number {
  const tb = new Date(b.createdAt).getTime();
  const ta = new Date(a.createdAt).getTime();
  if (tb !== ta) return tb - ta;
  return a.id.localeCompare(b.id);
}

export function takeVereinsentwicklungOverviewPreview<T extends VereinsentwicklungOverviewSortable>(
  rows: T[],
  limit = VEREINSENTWICKLUNG_OVERVIEW_PREVIEW_LIMIT,
): T[] {
  return [...rows].sort(compareVereinsentwicklungOverviewNewestFirst).slice(0, limit);
}

export type VereinsentwicklungOverviewPreview = {
  strategies: ClubStrategyListItemDto[];
  targets: StrategyTargetOverview[];
  tasks: VorhabenWorkspaceTaskRow[];
  showStrategien: boolean;
  showZiele: boolean;
  showAufgaben: boolean;
};

export async function loadVereinsentwicklungOverviewPreview(input: {
  actor: ActorContext;
  orgEinheit: VereinsentwicklungOrgEinheitFilter | null;
  targetsForOrgScope: TargetListItem[];
}): Promise<VereinsentwicklungOverviewPreview> {
  const { actor, orgEinheit, targetsForOrgScope } = input;
  const orgUnitId = orgEinheit?.id ?? null;
  const orgQuery: Record<string, string> = orgUnitId
    ? { [CD_WORKSPACE_ORG_UNIT_QUERY]: orgUnitId }
    : {};
  const planningAccess = hasSprintManagePermission(actor);

  const showStrategien = canAccessConnectedView("strategien", actor.permissionKeys, planningAccess);
  const showZiele = canAccessConnectedView("ziele", actor.permissionKeys, planningAccess);
  const showAufgaben = canAccessConnectedView("aufgaben", actor.permissionKeys, planningAccess);

  let strategies: ClubStrategyListItemDto[] = [];
  if (showStrategien) {
    const all = await listClubStrategies(actor, { orgUnitId });
    strategies = takeVereinsentwicklungOverviewPreview(all);
  }

  let targets: StrategyTargetOverview[] = [];
  if (
    showZiele &&
    (actor.permissionKeys.includes(PERMISSIONS.TARGETS_VIEW) ||
      actor.permissionKeys.includes(PERMISSIONS.TARGETS_MANAGE))
  ) {
    const { targets: overviewTargets } = await loadStrategyOverview(actor);
    const orgScopedIds = new Set(
      filterTargetsForOrgEinheit(targetsForOrgScope, orgEinheit).map((row) => row.id),
    );
    const scoped = orgEinheit
      ? overviewTargets.filter((row) => orgScopedIds.has(row.id))
      : overviewTargets;
    targets = takeVereinsentwicklungOverviewPreview(scoped);
  }

  let tasks: VorhabenWorkspaceTaskRow[] = [];
  if (
    showAufgaben &&
    (actor.permissionKeys.includes(PERMISSIONS.TASKS_VIEW) ||
      actor.permissionKeys.includes(PERMISSIONS.TASKS_MANAGE) ||
      actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_VIEW) ||
      actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_MANAGE))
  ) {
    const workspace = await loadVorhabenWorkspace(
      actor,
      { orgUnitId: orgUnitId ?? undefined },
      {
        returnToPath: buildUebersichtHref(orgQuery),
        taskOrder: "createdAtDesc",
        taskTake: 200,
      },
    );
    if (workspace.canViewTasks) {
      tasks = takeVereinsentwicklungOverviewPreview(workspace.tasks);
    }
  }

  return {
    strategies,
    targets,
    tasks,
    showStrategien,
    showZiele,
    showAufgaben,
  };
}