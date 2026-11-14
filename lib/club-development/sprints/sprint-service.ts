import "server-only";

import { DevelopmentSprintStatus, TaskStatus, VisibilityScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export class SprintServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SprintServiceError";
  }
}

export async function createDevelopmentSprint(
  tenantId: string,
  actorUserId: string,
  input: {
    title: string;
    slug?: string;
    goal?: string | null;
    status?: DevelopmentSprintStatus;
    owner?: string | null;
    ownerPersonId?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    visibilityScope?: VisibilityScope;
  },
) {
  const title = input.title.trim();
  if (!title) throw new SprintServiceError("Titel ist erforderlich.");
  const slug =
    (input.slug ?? "").trim() ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const collision = await prisma.developmentSprint.findFirst({
    where: { tenantId, slug },
    select: { id: true },
  });
  if (collision) throw new SprintServiceError(`Slug "${slug}" ist bereits vergeben.`);

  return prisma.developmentSprint.create({
    data: {
      tenantId,
      slug,
      title,
      goal: input.goal?.trim() || null,
      status: input.status ?? DevelopmentSprintStatus.PLANNED,
      owner: input.owner?.trim() || null,
      ownerPersonId: input.ownerPersonId?.trim() || null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      visibilityScope: input.visibilityScope ?? VisibilityScope.ORGANISATION,
      createdByUserId: actorUserId,
    },
  });
}

export async function updateDevelopmentSprint(
  tenantId: string,
  sprintId: string,
  input: Partial<{
    title: string;
    goal: string | null;
    status: DevelopmentSprintStatus;
    owner: string | null;
    ownerPersonId: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    visibilityScope: VisibilityScope;
  }>,
) {
  const existing = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: { id: true },
  });
  if (!existing) throw new SprintServiceError("Sprint nicht gefunden.");

  return prisma.developmentSprint.update({
    where: { id: sprintId },
    data: {
      title: input.title?.trim(),
      goal: input.goal !== undefined ? input.goal?.trim() || null : undefined,
      status: input.status,
      owner: input.owner !== undefined ? input.owner?.trim() || null : undefined,
      ownerPersonId:
        input.ownerPersonId !== undefined ? input.ownerPersonId?.trim() || null : undefined,
      startsAt: input.startsAt !== undefined ? input.startsAt : undefined,
      endsAt: input.endsAt !== undefined ? input.endsAt : undefined,
      visibilityScope: input.visibilityScope,
    },
  });
}

export async function assertTaskInTenant(tenantId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
    select: { id: true, contextType: true, contextId: true },
  });
  if (!task) throw new SprintServiceError("Aufgabe nicht gefunden.");
  return task;
}

export async function addTaskToSprint(tenantId: string, sprintId: string, taskId: string) {
  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: { id: true, status: true },
  });
  if (!sprint) throw new SprintServiceError("Sprint nicht gefunden.");
  await assertTaskInTenant(tenantId, taskId);

  const active = await prisma.developmentSprintTaskMembership.findFirst({
    where: { tenantId, sprintId, taskId, removedAt: null },
    select: { id: true },
  });
  if (active) throw new SprintServiceError("Aufgabe ist bereits im Sprint.");

  const otherSprint = await prisma.developmentSprintTaskMembership.findFirst({
    where: {
      tenantId,
      taskId,
      removedAt: null,
      sprintId: { not: sprintId },
    },
    select: { sprint: { select: { title: true } } },
  });
  if (otherSprint) {
    throw new SprintServiceError(
      `Aufgabe ist bereits im Sprint „${otherSprint.sprint.title}" — Aufgaben werden nicht automatisch verschoben.`,
    );
  }

  const revived = await prisma.developmentSprintTaskMembership.findFirst({
    where: { tenantId, sprintId, taskId },
    orderBy: { addedAt: "desc" },
  });
  if (revived?.removedAt) {
    return prisma.developmentSprintTaskMembership.update({
      where: { id: revived.id },
      data: {
        removedAt: null,
        addedAt: new Date(),
        addedAfterSprintStart: sprint.status === DevelopmentSprintStatus.ACTIVE,
      },
    });
  }

  return prisma.developmentSprintTaskMembership.create({
    data: {
      tenantId,
      sprintId,
      taskId,
      addedAfterSprintStart: sprint.status === DevelopmentSprintStatus.ACTIVE,
    },
  });
}

export async function removeTaskFromSprint(
  tenantId: string,
  sprintId: string,
  taskId: string,
  removedAt: Date = new Date(),
) {
  const updated = await prisma.developmentSprintTaskMembership.updateMany({
    where: { tenantId, sprintId, taskId, removedAt: null },
    data: { removedAt },
  });
  if (updated.count === 0) throw new SprintServiceError("Aufgabe ist nicht im Sprint.");
}

export async function listActiveSprintMemberships(tenantId: string, sprintId: string) {
  return prisma.developmentSprintTaskMembership.findMany({
    where: { tenantId, sprintId, removedAt: null },
    orderBy: { addedAt: "asc" },
  });
}

export type BulkAddTaskRejection = {
  taskId: string;
  code: "FORBIDDEN" | "NOT_FOUND" | "IN_TARGET_SPRINT" | "OTHER_SPRINT" | "INELIGIBLE" | "WRONG_TENANT";
  message: string;
};

export type BulkAddTasksToSprintResult = {
  addedCount: number;
  addedTaskIds: string[];
  rejected: BulkAddTaskRejection[];
  partial: boolean;
};

async function insertSprintMembership(
  tenantId: string,
  sprint: { id: string; status: DevelopmentSprintStatus },
  taskId: string,
) {
  const active = await prisma.developmentSprintTaskMembership.findFirst({
    where: { tenantId, sprintId: sprint.id, taskId, removedAt: null },
    select: { id: true },
  });
  if (active) return { kind: "duplicate" as const };

  const other = await prisma.developmentSprintTaskMembership.findFirst({
    where: {
      tenantId,
      taskId,
      removedAt: null,
      sprintId: { not: sprint.id },
    },
    select: { id: true, sprint: { select: { title: true } } },
  });
  if (other) {
    return {
      kind: "other_sprint" as const,
      sprintTitle: other.sprint.title,
    };
  }

  const revived = await prisma.developmentSprintTaskMembership.findFirst({
    where: { tenantId, sprintId: sprint.id, taskId },
    orderBy: { addedAt: "desc" },
  });
  if (revived?.removedAt) {
    await prisma.developmentSprintTaskMembership.update({
      where: { id: revived.id },
      data: {
        removedAt: null,
        addedAt: new Date(),
        addedAfterSprintStart: sprint.status === DevelopmentSprintStatus.ACTIVE,
      },
    });
    return { kind: "added" as const };
  }

  await prisma.developmentSprintTaskMembership.create({
    data: {
      tenantId,
      sprintId: sprint.id,
      taskId,
      addedAfterSprintStart: sprint.status === DevelopmentSprintStatus.ACTIVE,
    },
  });
  return { kind: "added" as const };
}

export async function bulkAddTasksToSprint(
  tenantId: string,
  sprintId: string,
  rawTaskIds: readonly string[],
  validateTask: (taskId: string) => Promise<
    | { ok: true; status: TaskStatus }
    | { ok: false; code: BulkAddTaskRejection["code"] }
  >,
): Promise<BulkAddTasksToSprintResult> {
  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: { id: true, status: true },
  });
  if (!sprint) throw new SprintServiceError("Sprint nicht gefunden.");
  if (sprint.status === DevelopmentSprintStatus.COMPLETED) {
    throw new SprintServiceError("Abgeschlossene Sprints können nicht mehr geplant werden.");
  }

  const taskIds = [...new Set(rawTaskIds.map((id) => id.trim()).filter(Boolean))];
  const rejected: BulkAddTaskRejection[] = [];
  const addedTaskIds: string[] = [];

  await prisma.$transaction(async () => {
    for (const taskId of taskIds) {
      const validation = await validateTask(taskId);
      if (!validation.ok) {
        rejected.push({
          taskId,
          code: validation.code,
          message:
            validation.code === "FORBIDDEN"
              ? "Aufgabe nicht sichtbar."
              : validation.code === "NOT_FOUND"
                ? "Aufgabe nicht gefunden."
                : validation.code === "IN_TARGET_SPRINT"
                  ? "Aufgabe ist bereits im Sprint."
                  : validation.code === "OTHER_SPRINT"
                    ? "Aufgabe ist bereits einem anderen Sprint zugeordnet."
                    : validation.code === "INELIGIBLE"
                      ? "Aufgabe kann nicht mehr geplant werden."
                      : "Aufgabe gehört nicht zu diesem Verein.",
        });
        continue;
      }

      if (validation.status === TaskStatus.DONE || validation.status === TaskStatus.CANCELLED) {
        rejected.push({
          taskId,
          code: "INELIGIBLE",
          message: "Abgeschlossene oder abgebrochene Aufgaben können nicht geplant werden.",
        });
        continue;
      }

      const inserted = await insertSprintMembership(tenantId, sprint, taskId);
      if (inserted.kind === "duplicate") {
        rejected.push({
          taskId,
          code: "IN_TARGET_SPRINT",
          message: "Aufgabe ist bereits im Sprint.",
        });
        continue;
      }
      if (inserted.kind === "other_sprint") {
        rejected.push({
          taskId,
          code: "OTHER_SPRINT",
          message: `Aufgabe ist bereits im Sprint „${inserted.sprintTitle}".`,
        });
        continue;
      }
      addedTaskIds.push(taskId);
    }
  });

  return {
    addedCount: addedTaskIds.length,
    addedTaskIds,
    rejected,
    partial: addedTaskIds.length > 0 && rejected.length > 0,
  };
}
