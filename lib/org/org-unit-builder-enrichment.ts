/**
 * Batched Organisation Builder enrichment — one load per page, no per-node hover fetching.
 */

import { prisma } from "@/lib/db/prisma";
import type { OrgUnitMembershipResponsibleInput } from "@/lib/org/org-unit-responsibility";

export type OrgUnitBuilderEnrichmentMap = Record<
  string,
  {
    primaryMemberships: OrgUnitMembershipResponsibleInput[];
    teamCount: number;
    personCount: number;
  }
>;

export async function loadOrgUnitBuilderEnrichment(
  tenantId: string,
  orgUnitIds: string[],
): Promise<OrgUnitBuilderEnrichmentMap> {
  if (orgUnitIds.length === 0) return {};

  const now = new Date();
  const expiryFilter = { OR: [{ endsAt: null }, { endsAt: { gt: now } }] };

  const [primaryMemberships, teamGroups, assignmentRows] = await Promise.all([
    prisma.orgUnitMembership.findMany({
      where: {
        orgUnitId: { in: orgUnitIds },
        status: "ACTIVE",
        isPrimary: true,
        ...expiryFilter,
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        orgUnitId: true,
        isPrimary: true,
        roleKey: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
      },
    }),
    prisma.team.groupBy({
      by: ["orgUnitId"],
      where: {
        tenantId,
        orgUnitId: { in: orgUnitIds },
        isActive: true,
      },
      _count: { _all: true },
    }),
    prisma.personAssignment.findMany({
      where: {
        tenantId,
        orgUnitId: { in: orgUnitIds },
        status: "ACTIVE",
      },
      select: { orgUnitId: true, personId: true },
    }),
  ]);

  const teamCountByOrg = new Map<string, number>();
  for (const row of teamGroups) {
    if (row.orgUnitId) teamCountByOrg.set(row.orgUnitId, row._count._all);
  }

  const personsByOrg = new Map<string, Set<string>>();
  for (const row of assignmentRows) {
    let set = personsByOrg.get(row.orgUnitId);
    if (!set) {
      set = new Set();
      personsByOrg.set(row.orgUnitId, set);
    }
    set.add(row.personId);
  }

  const membershipsByOrg = new Map<string, OrgUnitMembershipResponsibleInput[]>();
  for (const m of primaryMemberships) {
    const list = membershipsByOrg.get(m.orgUnitId) ?? [];
    list.push({
      id: m.id,
      isPrimary: m.isPrimary,
      roleKey: m.roleKey,
      user: m.user,
      person: m.person,
    });
    membershipsByOrg.set(m.orgUnitId, list);
  }

  const result: OrgUnitBuilderEnrichmentMap = {};
  for (const id of orgUnitIds) {
    result[id] = {
      primaryMemberships: membershipsByOrg.get(id) ?? [],
      teamCount: teamCountByOrg.get(id) ?? 0,
      personCount: personsByOrg.get(id)?.size ?? 0,
    };
  }
  return result;
}
