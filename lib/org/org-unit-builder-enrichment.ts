/**
 * Batched Organisation Builder enrichment — one load per page, no per-node hover fetching.
 */

import { prisma } from "@/lib/db/prisma";
import type { OrgUnitStaffAssignmentInput } from "@/lib/org/org-unit-people";
import type { OrgUnitMembershipResponsibleInput } from "@/lib/org/org-unit-responsibility";

export type OrgUnitBuilderEnrichmentMap = Record<
  string,
  {
    primaryMemberships: OrgUnitMembershipResponsibleInput[];
    teamCount: number;
    /** Unique persons with ACTIVE PersonAssignment in this OrgUnit. */
    staffCount: number;
    /** Active OrgUnitMembership rows (governance — not staff semantics). */
    membershipCount: number;
    staffAssignments: OrgUnitStaffAssignmentInput[];
  }
>;

export async function loadOrgUnitBuilderEnrichment(
  tenantId: string,
  orgUnitIds: string[],
): Promise<OrgUnitBuilderEnrichmentMap> {
  if (orgUnitIds.length === 0) return {};

  const now = new Date();
  const expiryFilter = { OR: [{ endsAt: null }, { endsAt: { gt: now } }] };

  const [primaryMemberships, membershipGroups, teamGroups, assignmentRows] = await Promise.all([
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
    prisma.orgUnitMembership.groupBy({
      by: ["orgUnitId"],
      where: {
        orgUnitId: { in: orgUnitIds },
        status: "ACTIVE",
        ...expiryFilter,
      },
      _count: { _all: true },
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
      select: {
        id: true,
        orgUnitId: true,
        personId: true,
        functionKey: true,
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
        team: {
          select: { id: true, name: true, shortName: true },
        },
      },
    }),
  ]);

  const teamCountByOrg = new Map<string, number>();
  for (const row of teamGroups) {
    if (row.orgUnitId) teamCountByOrg.set(row.orgUnitId, row._count._all);
  }

  const staffPersonIdsByOrg = new Map<string, Set<string>>();
  const assignmentsByOrg = new Map<string, OrgUnitStaffAssignmentInput[]>();
  for (const row of assignmentRows) {
    let set = staffPersonIdsByOrg.get(row.orgUnitId);
    if (!set) {
      set = new Set();
      staffPersonIdsByOrg.set(row.orgUnitId, set);
    }
    set.add(row.personId);

    const list = assignmentsByOrg.get(row.orgUnitId) ?? [];
    list.push({
      id: row.id,
      personId: row.personId,
      functionKey: row.functionKey,
      person: row.person,
      team: row.team,
    });
    assignmentsByOrg.set(row.orgUnitId, list);
  }

  const membershipCountByOrg = new Map<string, number>();
  for (const row of membershipGroups) {
    membershipCountByOrg.set(row.orgUnitId, row._count._all);
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
      staffCount: staffPersonIdsByOrg.get(id)?.size ?? 0,
      membershipCount: membershipCountByOrg.get(id) ?? 0,
      staffAssignments: assignmentsByOrg.get(id) ?? [],
    };
  }
  return result;
}
