import { prisma } from "@/lib/db/prisma";
import { getEligibleTenantMembers } from "@/lib/roles/tenant-queries";

export type ClubMeldungAssignOrgUnitOption = { id: string; name: string };

export type ClubMeldungAssignMemberOption = {
  id: string;
  firstName: string;
  lastName: string;
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

  return {
    orgUnits,
    members: members.map((member) => ({
      id: member.userId,
      firstName: member.firstName,
      lastName: member.lastName,
    })),
  };
}