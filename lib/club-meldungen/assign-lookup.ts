import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { getEligibleTenantMembers } from "@/lib/roles/tenant-queries";

export type ClubMeldungAssignOrgUnitOption = { id: string; name: string };

export type ClubMeldungAssignMemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  /** Active membership only — does not imply meldungen.handle. */
  canOperateCase: boolean;
};

export type ClubMeldungAssignOptions = {
  orgUnits: ClubMeldungAssignOrgUnitOption[];
  members: ClubMeldungAssignMemberOption[];
};

/**
 * Picker data for handler responsibility editing. Membership here does not grant
 * `meldungen.handle`; assignment only updates case responsibility fields.
 */
export async function loadClubMeldungAssignOptions(
  tenantId: string,
): Promise<ClubMeldungAssignOptions> {
  const [orgUnits, members] = await Promise.all([
    prisma.orgUnit.findMany({
      where: { tenantId, status: { not: "ARCHIVED" } },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    getEligibleTenantMembers(tenantId),
  ]);

  const linkedPeople = await prisma.person.findMany({
    where: {
      tenantId,
      isActive: true,
      userId: { in: members.map((member) => member.userId) },
    },
    select: { userId: true, firstName: true, lastName: true },
  });
  const personNameByUserId = new Map(
    linkedPeople
      .filter((row): row is typeof row & { userId: string } => row.userId != null)
      .map((row) => [row.userId, { firstName: row.firstName, lastName: row.lastName }]),
  );

  const resolver = createEffectivePermissionResolver(prisma);
  const memberOptions = await Promise.all(
    members.map(async (member) => {
      const canOperateCase = await resolver.hasPermission({
        userId: member.userId,
        tenantId,
        permission: PERMISSIONS.MELDUNGEN_HANDLE,
      });
      const personName = personNameByUserId.get(member.userId);
      return {
        id: member.userId,
        firstName: personName?.firstName ?? member.firstName,
        lastName: personName?.lastName ?? member.lastName,
        canOperateCase,
      };
    }),
  );

  return {
    orgUnits,
    members: memberOptions,
  };
}