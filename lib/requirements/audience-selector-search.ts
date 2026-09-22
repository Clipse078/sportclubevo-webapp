/**
 * AUFGABEN-06G7 — tenant-scoped audience selector search for Requirement drafts.
 */

import { prisma } from "@/lib/db/prisma";
import { REQUIREMENT_PERSON_SEARCH_MIN_CHARS } from "./person-search-constants";

const DEFAULT_LIMIT = 20;

export type RequirementAudienceTeamOption = { teamId: string; label: string };
export type RequirementAudienceOrgUnitOption = { orgUnitId: string; label: string };
export type RequirementAudienceRoleOption = { roleId: string; label: string };
export type RequirementAudienceTargetGroupOption = { targetGroupId: string; label: string };

function normalizeTerm(query: string): string {
  return query.trim();
}

export async function searchRequirementAudienceTeams(
  tenantId: string,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<RequirementAudienceTeamOption[]> {
  const term = normalizeTerm(query);
  if (term.length < REQUIREMENT_PERSON_SEARCH_MIN_CHARS) return [];

  const rows = await prisma.team.findMany({
    where: {
      tenantId,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { shortName: { contains: term, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  return rows.map((row) => ({
    teamId: row.id,
    label: row.name,
  }));
}

export async function searchRequirementAudienceOrgUnits(
  tenantId: string,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<RequirementAudienceOrgUnitOption[]> {
  const term = normalizeTerm(query);
  if (term.length < REQUIREMENT_PERSON_SEARCH_MIN_CHARS) return [];

  const rows = await prisma.orgUnit.findMany({
    where: {
      tenantId,
      OR: [{ name: { contains: term, mode: "insensitive" } }, { key: { contains: term, mode: "insensitive" } }],
    },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  return rows.map((row) => ({
    orgUnitId: row.id,
    label: row.name,
  }));
}

export async function searchRequirementAudienceRoles(
  tenantId: string,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<RequirementAudienceRoleOption[]> {
  const term = normalizeTerm(query);
  if (term.length < REQUIREMENT_PERSON_SEARCH_MIN_CHARS) return [];

  const rows = await prisma.role.findMany({
    where: {
      tenantId,
      scope: "TENANT",
      OR: [{ name: { contains: term, mode: "insensitive" } }],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  return rows.map((row) => ({
    roleId: row.id,
    label: row.name,
  }));
}

export async function searchRequirementAudienceTargetGroups(
  tenantId: string,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<RequirementAudienceTargetGroupOption[]> {
  const term = normalizeTerm(query);
  if (term.length < REQUIREMENT_PERSON_SEARCH_MIN_CHARS) return [];

  const rows = await prisma.targetGroup.findMany({
    where: {
      tenantId,
      name: { contains: term, mode: "insensitive" },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  return rows.map((row) => ({
    targetGroupId: row.id,
    label: row.name,
  }));
}

export async function loadRequirementAudienceLabels(input: {
  tenantId: string;
  teamIds: readonly string[];
  orgUnitIds: readonly string[];
  roleIds: readonly string[];
  targetGroupIds: readonly string[];
}): Promise<{
  teams: RequirementAudienceTeamOption[];
  orgUnits: RequirementAudienceOrgUnitOption[];
  roles: RequirementAudienceRoleOption[];
  targetGroups: RequirementAudienceTargetGroupOption[];
}> {
  const [teams, orgUnits, roles, targetGroups] = await Promise.all([
    input.teamIds.length
      ? prisma.team.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.teamIds] } },
          select: { id: true, name: true, shortName: true },
        })
      : Promise.resolve([]),
    input.orgUnitIds.length
      ? prisma.orgUnit.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.orgUnitIds] } },
          select: { id: true, name: true, key: true },
        })
      : Promise.resolve([]),
    input.roleIds.length
      ? prisma.role.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.roleIds] }, scope: "TENANT" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    input.targetGroupIds.length
      ? prisma.targetGroup.findMany({
          where: { tenantId: input.tenantId, id: { in: [...input.targetGroupIds] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    teams: teams.map((row) => ({
      teamId: row.id,
      label: row.shortName?.trim() || row.name,
    })),
    orgUnits: orgUnits.map((row) => ({
      orgUnitId: row.id,
      label: row.name,
    })),
    roles: roles.map((row) => ({ roleId: row.id, label: row.name })),
    targetGroups: targetGroups.map((row) => ({
      targetGroupId: row.id,
      label: row.name,
    })),
  };
}
