/**
 * SCE-PERF-DASHBOARD-01 — bounded team communication authorization for a tenant actor.
 * Resolves shared prerequisites once; per-team view/send uses allocation map or global flags.
 * Request-scoped via React cache (no cross-user persistence).
 */

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import {
  isPlatformSuperAdmin,
  isTenantClubAdmin,
  resolvePersonIdForUser,
  type TeamDocumentAllocation,
} from "@/lib/teams/team-document-auth";
import { currentTeamSeasonWhere } from "@/lib/teams/current-season";
import {
  logSceHotfixLogin01Step,
  logSceHotfixLogin01StepDone,
  recordSceHotfixLogin01DuplicateProbe,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";

const ACTIVE_PLAYER_STATUSES = ["ACTIVE", "INJURED", "ABSENT"] as const;

export type TeamCommunicationAuthorizationScope = {
  tenantId: string;
  tenantKey: string;
  userId: string;
  allTeamIds: string[];
  globalCanView: boolean;
  globalCanSend: boolean;
  allocationByTeamId: ReadonlyMap<string, TeamDocumentAllocation>;
};

function tenantPermissionFlags(tenantPermissions: readonly string[]) {
  const has = (key: string) => tenantPermissions.includes(key);
  const orgCommAdmin =
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE) ||
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW);
  const globalCanView =
    has(PERMISSIONS.COMMUNICATION_TEAM_VIEW) ||
    has(PERMISSIONS.COMMUNICATION_TEAM_SEND) ||
    orgCommAdmin ||
    has(PERMISSIONS.TEAMS_MANAGE);
  const globalCanSend =
    has(PERMISSIONS.COMMUNICATION_TEAM_SEND) ||
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE) ||
    has(PERMISSIONS.TEAMS_MANAGE);
  return { globalCanView, globalCanSend, orgCommAdmin };
}

export function resolveTeamCommunicationFromScope(
  scope: TeamCommunicationAuthorizationScope,
  teamId: string,
): { canView: boolean; canSend: boolean } | null {
  if (!scope.allTeamIds.includes(teamId)) {
    return null;
  }
  const allocation = scope.allocationByTeamId.get(teamId);
  const canView = scope.globalCanView || (allocation?.isAllocated ?? false);
  const canSend = scope.globalCanSend || (allocation?.isTrainer ?? false);
  return { canView, canSend };
}

async function loadAllocationByTeamId(
  tenantId: string,
  personId: string,
  teamIds: string[],
): Promise<Map<string, TeamDocumentAllocation>> {
  const map = new Map<string, TeamDocumentAllocation>();
  for (const teamId of teamIds) {
    map.set(teamId, { isAllocated: false, isPlayer: false, isTrainer: false });
  }
  if (teamIds.length === 0) {
    return map;
  }

  const currentSeasons = await prisma.teamSeason.findMany({
    where: {
      teamId: { in: teamIds },
      team: { tenantId },
      ...currentTeamSeasonWhere(),
    },
    select: { id: true, teamId: true },
  });

  const seasonIds = currentSeasons.map((row) => row.id);
  if (seasonIds.length === 0) {
    return map;
  }

  const [playerRows, trainerRows] = await Promise.all([
    prisma.playerSquadMember.findMany({
      where: {
        teamSeasonId: { in: seasonIds },
        personId,
        status: { in: [...ACTIVE_PLAYER_STATUSES] },
      },
      select: { teamSeasonId: true },
    }),
    prisma.trainerTeamMember.findMany({
      where: {
        teamSeasonId: { in: seasonIds },
        personId,
        status: "ACTIVE",
      },
      select: { teamSeasonId: true },
    }),
  ]);

  const seasonToTeam = new Map(currentSeasons.map((row) => [row.id, row.teamId]));

  for (const row of playerRows) {
    const teamId = seasonToTeam.get(row.teamSeasonId);
    if (!teamId) continue;
    const existing = map.get(teamId)!;
    map.set(teamId, {
      isAllocated: true,
      isPlayer: true,
      isTrainer: existing.isTrainer,
    });
  }
  for (const row of trainerRows) {
    const teamId = seasonToTeam.get(row.teamSeasonId);
    if (!teamId) continue;
    const existing = map.get(teamId)!;
    map.set(teamId, {
      isAllocated: true,
      isPlayer: existing.isPlayer,
      isTrainer: true,
    });
  }

  return map;
}

async function buildTeamCommunicationAuthorizationScope(
  tenantId: string,
  userId: string,
): Promise<TeamCommunicationAuthorizationScope> {
  recordSceHotfixLogin01DuplicateProbe("getTeamCommunicationAuthorizationScope");
  const trace = sceHotfixLogin01TraceEnabled();
  if (trace) {
    logSceHotfixLogin01Step("authorization-scope");
  }

  const [tenant, teams, effective, isSuperAdmin, personId] = await Promise.all([
    prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { key: true },
    }),
    prisma.team.findMany({
      where: { tenantId },
      select: { id: true },
    }),
    getRequestEffectivePermissions(userId, tenantId),
    isPlatformSuperAdmin(userId),
    resolvePersonIdForUser(userId, tenantId),
  ]);

  if (!tenant?.key) {
    throw new Error("Tenant not found.");
  }

  const tenantKey = tenant.key;
  const allTeamIds = teams.map((team) => team.id);
  const tenantPermissions = effective.tenant;
  const flags = tenantPermissionFlags(tenantPermissions);

  const isClubAdmin = await isTenantClubAdmin(userId, tenantId, tenantKey);

  const globalCanView = isSuperAdmin || isClubAdmin || flags.globalCanView;
  const globalCanSend = isSuperAdmin || isClubAdmin || flags.globalCanSend;

  let allocationByTeamId: Map<string, TeamDocumentAllocation> = new Map();
  if (personId && !globalCanView) {
    allocationByTeamId = await loadAllocationByTeamId(tenantId, personId, allTeamIds);
  }

  const scope = {
    tenantId,
    tenantKey,
    userId,
    allTeamIds,
    globalCanView,
    globalCanSend,
    allocationByTeamId,
  };
  if (trace) {
    logSceHotfixLogin01StepDone("authorization-scope");
  }
  return scope;
}

export const getTeamCommunicationAuthorizationScope = cache(buildTeamCommunicationAuthorizationScope);

/** Team ids with team communication view (Spielbetrieb + Training audience discovery). */
export const listTeamIdsWithTeamCommunicationView = cache(
  async (input: { tenantId: string; userId: string }): Promise<string[]> => {
    recordSceHotfixLogin01DuplicateProbe("listTeamIdsWithTeamCommunicationView");
    const scope = await getTeamCommunicationAuthorizationScope(input.tenantId, input.userId);
    if (scope.globalCanView) {
      return scope.allTeamIds;
    }
    return scope.allTeamIds.filter(
      (teamId) => scope.allocationByTeamId.get(teamId)?.isAllocated ?? false,
    );
  },
);
