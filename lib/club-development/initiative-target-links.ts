import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  assertInitiativeInTenant,
  assertTargetInTenant,
  InitiativeMilestoneTenantError,
} from "./initiative-milestone-service";

export { InitiativeMilestoneTenantError as InitiativeTargetLinkError };

export async function listInitiativeTargetLinks(tenantId: string, initiativeId: string) {
  await assertInitiativeInTenant(tenantId, initiativeId);
  return prisma.initiativeTargetLink.findMany({
    where: { tenantId, initiativeId },
    include: {
      target: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function linkInitiativeTarget(
  tenantId: string,
  initiativeId: string,
  targetId: string,
) {
  await assertInitiativeInTenant(tenantId, initiativeId);
  await assertTargetInTenant(tenantId, targetId);

  return prisma.initiativeTargetLink.upsert({
    where: { initiativeId_targetId: { initiativeId, targetId } },
    create: { tenantId, initiativeId, targetId },
    update: {},
    include: {
      target: { select: { id: true, title: true, status: true } },
    },
  });
}

export async function unlinkInitiativeTarget(
  tenantId: string,
  initiativeId: string,
  targetId: string,
) {
  await assertInitiativeInTenant(tenantId, initiativeId);
  const removed = await prisma.initiativeTargetLink.deleteMany({
    where: { tenantId, initiativeId, targetId },
  });
  if (removed.count === 0) {
    throw new InitiativeMilestoneTenantError("Link not found.");
  }
}

export async function listTargetInitiativeLinks(tenantId: string, targetId: string) {
  await assertTargetInTenant(tenantId, targetId);
  return prisma.initiativeTargetLink.findMany({
    where: { tenantId, targetId },
    include: {
      initiative: { select: { id: true, slug: true, title: true, status: true } },
    },
  });
}
