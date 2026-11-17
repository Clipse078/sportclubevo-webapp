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
import { refreshInitiativeProgressForTaskContext } from "@/lib/club-development/initiative-progress-hooks";
import { buildMeetingDecisionTaskOccurrenceKey } from "@/lib/meetings/meeting-traktandum-task-link";
import {
  assertMeetingTaskIdempotencyPayloadMatches,
  isPrismaUniqueConstraintError,
  type MeetingTaskIdempotencyPayload,
} from "@/lib/meetings/meeting-task-create-idempotency";

export type MeetingDecisionTaskSummary = ContextRelatedTaskSummaryDto;

const IDEMPOTENCY_TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  dueAt: true,
  priority: true,
  orgUnitId: true,
  assignees: { select: { userId: true } },
} as const;

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

async function loadTaskForIdempotency(tenantId: string, occurrenceKey: string) {
  return prisma.task.findFirst({
    where: { tenantId, seriesOccurrenceKey: occurrenceKey },
    select: IDEMPOTENCY_TASK_SELECT,
  });
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
  clientRequestId?: string | null;
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

  const clientRequestId = input.clientRequestId?.trim() || input.idempotencyKey?.trim() || null;
  const dueAt =
    input.dueAt && !Number.isNaN(Date.parse(input.dueAt)) ? new Date(input.dueAt) : null;
  const payload: MeetingTaskIdempotencyPayload = {
    title,
    description: input.description,
    dueAt,
    priority: input.priority,
    orgUnitId: input.orgUnitId,
    assigneeUserIds: input.assigneeUserIds,
  };

  let occurrenceKey: string | null = null;
  if (clientRequestId) {
    occurrenceKey = buildMeetingDecisionTaskOccurrenceKey(decisionId, clientRequestId);
    const existing = await loadTaskForIdempotency(ctx.tenantId, occurrenceKey);
    if (existing) {
      assertMeetingTaskIdempotencyPayloadMatches(payload, existing);
      return { taskId: existing.id, deduplicated: true as const };
    }
  }

  try {
    const task = await createTaskWithContextDefaults(ctx, {
      task: {
        title,
        description: input.description?.trim() || null,
        dueAt,
        priority: (input.priority as never) ?? undefined,
        orgUnitId: input.orgUnitId ?? null,
        assigneeUserIds: input.assigneeUserIds ?? [],
        seriesOccurrenceKey: occurrenceKey,
      },
      trustedContext: {
        contextType: TaskContextType.MEETING_DECISION,
        contextId: decisionId,
      },
    });

    await refreshInitiativeProgressForTaskContext(
      ctx.tenantId,
      TaskContextType.MEETING_DECISION,
      decisionId,
    );

    return { taskId: task.id, deduplicated: false as const };
  } catch (error) {
    if (occurrenceKey && isPrismaUniqueConstraintError(error)) {
      const raced = await loadTaskForIdempotency(ctx.tenantId, occurrenceKey);
      if (raced) {
        assertMeetingTaskIdempotencyPayloadMatches(payload, raced);
        return { taskId: raced.id, deduplicated: true as const };
      }
    }
    throw error;
  }
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

  await refreshInitiativeProgressForTaskContext(
    ctx.tenantId,
    TaskContextType.MEETING_DECISION,
    decisionId,
  );

  return { taskId: task.id, alreadyLinked: false as const };
}