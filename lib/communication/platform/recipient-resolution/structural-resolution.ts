/**
 * SCE-COMM-03 — structural audience → canonical Person ids (tenant-scoped).
 */

import { prisma } from "@/lib/db/prisma";
import type { StructuralAudienceSelectors } from "@/lib/communication/platform/audience/structural-targets";
import {
  resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds,
  resolveTeamAudiencePersonIds,
} from "@/lib/requirements/requirement-audience-resolvers";
import {
  intersectSortedSets,
  sortPersonIds,
  unionSortedSets,
} from "@/lib/communication/platform/recipient-resolution/set-algebra";

export async function resolveWholeOrganisationPersonIds(tenantId: string): Promise<string[]> {
  const rows = await prisma.person.findMany({
    where: { tenantId, isActive: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => r.id);
}

export async function resolveRoleKeysAudiencePersonIds(
  tenantId: string,
  roleKeys: readonly string[],
): Promise<string[]> {
  const keys = [...new Set(roleKeys.map((k) => k.trim()).filter(Boolean))];
  if (keys.length === 0) return [];

  const roles = await prisma.role.findMany({
    where: { tenantId, scope: "TENANT", key: { in: keys } },
    select: { id: true, key: true },
  });
  if (roles.length !== keys.length) {
    throw new Error("INVALID_ROLE_KEYS_AUDIENCE");
  }
  return resolveRoleAudiencePersonIds(
    tenantId,
    roles.map((r) => r.id),
  );
}

export type StructuralResolutionMode = "UNION" | "INTERSECTION";

export async function resolveStructuralAudiencePersonIds(input: {
  tenantId: string;
  selectors: StructuralAudienceSelectors;
  mode: StructuralResolutionMode;
}): Promise<string[]> {
  const { tenantId, selectors, mode } = input;
  const parts: string[][] = [];

  if (selectors.wholeOrganisation) {
    parts.push(await resolveWholeOrganisationPersonIds(tenantId));
  }
  if ((selectors.orgUnitIds?.length ?? 0) > 0) {
    parts.push(await resolveOrgUnitAudiencePersonIds(tenantId, selectors.orgUnitIds!));
  }
  if ((selectors.teamIds?.length ?? 0) > 0) {
    parts.push(await resolveTeamAudiencePersonIds(tenantId, selectors.teamIds!));
  }
  if ((selectors.roleIds?.length ?? 0) > 0) {
    parts.push(await resolveRoleAudiencePersonIds(tenantId, selectors.roleIds!));
  }
  if ((selectors.roleKeys?.length ?? 0) > 0) {
    parts.push(await resolveRoleKeysAudiencePersonIds(tenantId, selectors.roleKeys!));
  }

  if (parts.length === 0) return [];
  return mode === "INTERSECTION" ? intersectSortedSets(parts) : unionSortedSets(parts);
}

export async function resolveExplicitPersonIds(
  tenantId: string,
  personIds: readonly string[],
): Promise<{ active: string[]; inactiveOrForeign: string[] }> {
  const unique = sortPersonIds(personIds);
  if (unique.length === 0) return { active: [], inactiveOrForeign: [] };

  const rows = await prisma.person.findMany({
    where: { id: { in: unique } },
    select: { id: true, tenantId: true, isActive: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const active: string[] = [];
  const inactiveOrForeign: string[] = [];

  for (const id of unique) {
    const row = byId.get(id);
    if (!row || row.tenantId !== tenantId || !row.isActive) {
      inactiveOrForeign.push(id);
    } else {
      active.push(id);
    }
  }
  return { active: sortPersonIds(active), inactiveOrForeign: sortPersonIds(inactiveOrForeign) };
}

export async function resolveStructuralExclusionPersonIds(input: {
  tenantId: string;
  selectors: StructuralAudienceSelectors;
}): Promise<string[]> {
  return resolveStructuralAudiencePersonIds({
    tenantId: input.tenantId,
    selectors: input.selectors,
    mode: "UNION",
  });
}
