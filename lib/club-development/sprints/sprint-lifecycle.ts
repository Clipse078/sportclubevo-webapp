import "server-only";

import { DevelopmentSprintStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { CD_SPRINT_API_COPY } from "@/lib/club-development/product-copy";
import { SprintServiceError, updateDevelopmentSprint } from "./sprint-service";

const ALLOWED_STATUS_TRANSITIONS: Record<DevelopmentSprintStatus, DevelopmentSprintStatus[]> = {
  PLANNED: [DevelopmentSprintStatus.ACTIVE],
  ACTIVE: [DevelopmentSprintStatus.COMPLETED],
  COMPLETED: [],
};

export function assertSprintStatusTransition(
  from: DevelopmentSprintStatus,
  to: DevelopmentSprintStatus,
): void {
  if (from === to) return;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new SprintServiceError(
      `Ungültiger Statuswechsel von „${from}" nach „${to}".`,
    );
  }
}

export async function startDevelopmentSprint(
  tenantId: string,
  sprintId: string,
  startedAt: Date = new Date(),
) {
  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: { id: true, status: true },
  });
  if (!sprint) throw new SprintServiceError(CD_SPRINT_API_COPY.phaseNotFound);
  assertSprintStatusTransition(sprint.status, DevelopmentSprintStatus.ACTIVE);

  await prisma.$transaction(async (tx) => {
    await tx.developmentSprint.update({
      where: { id: sprintId },
      data: {
        status: DevelopmentSprintStatus.ACTIVE,
        startedAt,
      },
    });
    await tx.developmentSprintTaskMembership.updateMany({
      where: { tenantId, sprintId, removedAt: null, committedAtSprintStart: false },
      data: { committedAtSprintStart: true },
    });
  });

  return prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
  });
}

export async function patchDevelopmentSprintMetadata(
  tenantId: string,
  sprintId: string,
  input: Parameters<typeof updateDevelopmentSprint>[2],
) {
  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: { id: true, status: true },
  });
  if (!sprint) throw new SprintServiceError(CD_SPRINT_API_COPY.phaseNotFound);

  if (input.status !== undefined && input.status !== sprint.status) {
    if (input.status === DevelopmentSprintStatus.ACTIVE && sprint.status === DevelopmentSprintStatus.PLANNED) {
      await startDevelopmentSprint(tenantId, sprintId);
      const { status: _status, ...metadata } = input;
      return updateDevelopmentSprint(tenantId, sprintId, metadata);
    }
    if (input.status === DevelopmentSprintStatus.COMPLETED) {
      throw new SprintServiceError(CD_SPRINT_API_COPY.closeViaWorkflow);
    }
    assertSprintStatusTransition(sprint.status, input.status);
  }

  return updateDevelopmentSprint(tenantId, sprintId, input);
}