import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { createTaskWithContextDefaults } from "@/lib/tasks/contextual-task-create";
import { listTasksForContext } from "@/lib/tasks/list-tasks-for-context";
import { updateTask } from "@/lib/tasks/task-service";
import { TaskValidationError } from "@/lib/tasks/errors";
import type { ContextRelatedTaskSummaryDto } from "@/lib/tasks/context-related-task-types";

export type MeetingDecisionTaskSummary = ContextRelatedTaskSummaryDto;

async function assertDecisionInMeeting(actor: ActorContext, meetingId: string, decisionId: string) {
  const guard = await requireMeetingAccess({ actor, id: meetingId, access: "read" });
  if (!guard.ok) {
    throw new Error("Sitzung nicht verfügbar.");
  }
  const decision = await prisma.meetingDecision.findFirst({
    where: { id: decisionId, meetingId, meeting: { tenantId: actor.tenantId ?? undefined } },
    select: { id: true, title: true, meetingId: true },
  });
  if (!decision) {
    throw new Error("Beschluss nicht gefunden.");
  }
  return decision;
}

export async function listMeetingDecisionTasks(
  actor: ActorContext,
  meetingId: string,
  decisionId: string,
): Promise<MeetingDecisionTaskSummary[]> {
  await assertDecisionInMeeting(actor, meetingId, decisionId);
  const ctx = await getTaskServiceContext();
  if (!ctx) return [];
  try {
    const page = await listTasksForContext(
      ctx,
      TaskContextType.MEETING_DECISION,
      decisionId,
      { limit: 50 },
    );
    return page.tasks;
  } catch {
    return [];
  }
}

export type CreateMeetingDecisionTaskInput = {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  priority?: string;
  orgUnitId?: string | null;
  assigneeUserIds?: string[];
  idempotencyKey?: string | null;
};

export async function createMeetingDecisionTask(
  actor: ActorContext,
  meetingId: string,
  decisionId: string,
  input: CreateMeetingDecisionTaskInput,
) {
  const writeGuard = await requireMeetingAccess({ actor, id: meetingId, access: "write" });
  if (!writeGuard.ok) {
    throw new Error("Keine Berechtigung.");
  }
  await assertDecisionInMeeting(actor, meetingId, decisionId);

  const ctx = await getTaskServiceContext();
  if (!ctx) {
    throw new Error("Nicht angemeldet.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new TaskValidationError("Titel ist erforderlich.");
  }

  if (input.idempotencyKey?.trim()) {
    const existing = await prisma.task.findFirst({
      where: {
        tenantId: ctx.tenantId,
        contextType: TaskContextType.MEETING_DECISION,
        contextId: decisionId,
        title,
      },
      select: { id: true },
    });
    if (existing) {
      return { taskId: existing.id, deduplicated: true as const };
    }
  }

  const dueAt =
    input.dueAt && !Number.isNaN(Date.parse(input.dueAt)) ? new Date(input.dueAt) : null;

  const task = await createTaskWithContextDefaults(ctx, {
    task: {
      title,
      description: input.description?.trim() || null,
      dueAt,
      priority: (input.priority as never) ?? undefined,
      orgUnitId: input.orgUnitId ?? null,
      assigneeUserIds: input.assigneeUserIds ?? [],
    },
    trustedContext: {
      contextType: TaskContextType.MEETING_DECISION,
      contextId: decisionId,
    },
  });

  return { taskId: task.id, deduplicated: false as const };
}

export async function linkExistingTaskToMeetingDecision(
  actor: ActorContext,
  meetingId: string,
  decisionId: string,
  taskId: string,
) {
  const writeGuard = await requireMeetingAccess({ actor, id: meetingId, access: "write" });
  if (!writeGuard.ok) {
    throw new Error("Keine Berechtigung.");
  }
  await assertDecisionInMeeting(actor, meetingId, decisionId);

  const ctx = await getTaskServiceContext();
  if (!ctx) {
    throw new Error("Nicht angemeldet.");
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: ctx.tenantId },
    select: { id: true, contextType: true, contextId: true, parentTaskId: true },
  });
  if (!task || task.parentTaskId) {
    throw new TaskValidationError("Aufgabe nicht gefunden.");
  }

  if (
    task.contextType === TaskContextType.MEETING_DECISION &&
    task.contextId === decisionId
  ) {
    return { taskId: task.id, alreadyLinked: true as const };
  }
  if (task.contextType && task.contextId) {
    throw new TaskValidationError(
      "Diese Aufgabe ist bereits mit einem anderen Kontext verknüpft.",
    );
  }

  await updateTask(ctx, task.id, {
    contextType: TaskContextType.MEETING_DECISION,
    contextId: decisionId,
  });

  return { taskId: task.id, alreadyLinked: false as const };
}
