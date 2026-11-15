import "server-only";

import { prisma } from "@/lib/db/prisma";
import { InitiativeMilestoneStatus } from "@prisma/client";

export class InitiativeMilestoneTenantError extends Error {
  constructor(message = "Initiative or milestone not found.") {
    super(message);
    this.name = "InitiativeMilestoneTenantError";
  }
}

export async function assertInitiativeInTenant(tenantId: string, initiativeId: string) {
  const row = await prisma.initiative.findFirst({
    where: { id: initiativeId, tenantId },
    select: { id: true },
  });
  if (!row) throw new InitiativeMilestoneTenantError();
  return row;
}

export async function assertTargetInTenant(tenantId: string, targetId: string) {
  const row = await prisma.target.findFirst({
    where: { id: targetId, tenantId },
    select: { id: true },
  });
  if (!row) throw new InitiativeMilestoneTenantError("Target not found.");
  return row;
}

export async function listInitiativeMilestones(tenantId: string, initiativeId: string) {
  await assertInitiativeInTenant(tenantId, initiativeId);
  return prisma.initiativeMilestone.findMany({
    where: { tenantId, initiativeId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export type CreateInitiativeMilestoneInput = {
  title: string;
  description?: string | null;
  targetDate?: Date | null;
  sortOrder?: number;
};

export async function createInitiativeMilestone(
  tenantId: string,
  initiativeId: string,
  input: CreateInitiativeMilestoneInput,
) {
  await assertInitiativeInTenant(tenantId, initiativeId);
  const title = input.title.trim();
  if (!title) throw new Error("Titel ist erforderlich.");

  return prisma.initiativeMilestone.create({
    data: {
      tenantId,
      initiativeId,
      title,
      description: input.description?.trim() || null,
      targetDate: input.targetDate ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export type UpdateInitiativeMilestoneInput = {
  title?: string;
  description?: string | null;
  targetDate?: Date | null;
  sortOrder?: number;
  status?: InitiativeMilestoneStatus;
};

export async function updateInitiativeMilestone(
  tenantId: string,
  initiativeId: string,
  milestoneId: string,
  input: UpdateInitiativeMilestoneInput,
) {
  await assertInitiativeInTenant(tenantId, initiativeId);
  const existing = await prisma.initiativeMilestone.findFirst({
    where: { id: milestoneId, tenantId, initiativeId },
    select: { id: true, status: true },
  });
  if (!existing) throw new InitiativeMilestoneTenantError("Milestone not found.");

  const nextStatus = input.status ?? existing.status;
  const completedAt =
    nextStatus === InitiativeMilestoneStatus.DONE
      ? new Date()
      : nextStatus === InitiativeMilestoneStatus.OPEN
        ? null
        : undefined;

  return prisma.initiativeMilestone.update({
    where: { id: milestoneId },
    data: {
      title: input.title !== undefined ? input.title.trim() : undefined,
      description: input.description !== undefined ? input.description?.trim() || null : undefined,
      targetDate: input.targetDate !== undefined ? input.targetDate : undefined,
      sortOrder: input.sortOrder,
      status: input.status,
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });
}

export async function deleteInitiativeMilestone(
  tenantId: string,
  initiativeId: string,
  milestoneId: string,
) {
  await assertInitiativeInTenant(tenantId, initiativeId);
  const deleted = await prisma.initiativeMilestone.deleteMany({
    where: { id: milestoneId, tenantId, initiativeId },
  });
  if (deleted.count === 0) throw new InitiativeMilestoneTenantError("Milestone not found.");
}
