import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

export { prisma };

export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

export async function createRequirementTestTenant(label: string) {
  const suffix = uniqueSuffix();
  return prisma.tenant.create({
    data: {
      key: `req06g1-${label}-${suffix}`,
      name: `Requirements Test ${label} ${suffix}`,
    },
  });
}

export async function createRequirementTestUser(label: string) {
  const suffix = uniqueSuffix();
  return prisma.user.create({
    data: {
      email: `req06g1-${label}-${suffix}@example.test`,
      firstName: label,
      lastName: "Test",
      passwordHash: "test-hash",
      isActive: true,
    },
  });
}

export async function createRequirementTestPerson(tenantId: string, label: string, userId?: string) {
  const suffix = uniqueSuffix();
  return prisma.person.create({
    data: {
      tenantId,
      firstName: label,
      lastName: suffix,
      email: `req06g1-person-${label}-${suffix}@example.test`,
      isActive: true,
      ...(userId ? { userId } : {}),
    },
  });
}

export async function cleanupRequirementFixture(ids: {
  tenantIds?: string[];
  userIds?: string[];
  personIds?: string[];
  requirementIds?: string[];
}) {
  if (ids.requirementIds?.length) {
    await prisma.requirementRecipient.deleteMany({
      where: { requirementId: { in: ids.requirementIds } },
    });
    await prisma.requirementDraftAudiencePerson.deleteMany({
      where: { requirementId: { in: ids.requirementIds } },
    });
    await prisma.requirementDraftAudienceTeam.deleteMany({
      where: { requirementId: { in: ids.requirementIds } },
    });
    await prisma.requirementDraftAudienceOrgUnit.deleteMany({
      where: { requirementId: { in: ids.requirementIds } },
    });
    await prisma.requirementDraftAudienceRole.deleteMany({
      where: { requirementId: { in: ids.requirementIds } },
    });
    await prisma.requirementDraftAudienceTargetGroup.deleteMany({
      where: { requirementId: { in: ids.requirementIds } },
    });
    await prisma.requirement.deleteMany({ where: { id: { in: ids.requirementIds } } });
  }
  if (ids.personIds?.length) {
    await prisma.person.deleteMany({ where: { id: { in: ids.personIds } } });
  }
  if (ids.userIds?.length) {
    await prisma.user.deleteMany({ where: { id: { in: ids.userIds } } });
  }
  if (ids.tenantIds?.length) {
    await prisma.tenant.deleteMany({ where: { id: { in: ids.tenantIds } } });
  }
}
