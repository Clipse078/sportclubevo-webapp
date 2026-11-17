import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { createTaskWithContextDefaults } from "@/lib/tasks/contextual-task-create";
import { TaskValidationError } from "@/lib/tasks/errors";
import {
  buildTraktandumTaskOccurrenceKey,
  parseAgendaItemIdFromTraktandumTaskOccurrenceKey,
  traktandumTaskOccurrenceKeyPrefixForAgenda,
} from "@/lib/meetings/meeting-traktandum-task-link";
import { createMeetingDecisionTask } from "@/lib/meetings/meeting-decision-tasks";

async function assertAgendaInMeeting(actor: ActorContext, meetingId: string, agendaItemId: string) {
  if (!actor.tenantId) {
    throw new Error("Sitzung nicht verfügbar.");
  }
  const item = await prisma.meetingAgendaItem.findFirst({
    where: {
      id: agendaItemId.trim(),
      meetingId,
      meeting: { tenantId: actor.tenantId },
    },
    select: { id: true, meetingId: true },
  });
  if (!item) {
    throw new Error("Traktandum gehört nicht zu dieser Sitzung.");
  }
  return item;
}

export type CreateMeetingTraktandumTaskInput = {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  priority?: string;
  orgUnitId?: string | null;
  assigneeUserIds?: string[];
  idempotencyKey?: string | null;
  clientRequestId?: string | null;
};

export async function createMeetingTraktandumTask(
  actor: ActorContext,
  meetingId: string,
  agendaItemId: string,
  input: CreateMeetingTraktandumTaskInput,
) {
  const writeGuard = await requireMeetingAccess({ actor, id: meetingId, access: "write" });
  if (!writeGuard.ok) {
    throw new Error("Keine Berechtigung.");
  }
  await assertAgendaInMeeting(actor, meetingId, agendaItemId);

  const ctx = await getTaskServiceContext();
  if (!ctx) {
    throw new Error("Nicht angemeldet.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new TaskValidationError("Titel ist erforderlich.");
  }

  const clientRequestId = input.clientRequestId?.trim() || input.idempotencyKey?.trim() || null;
  let occurrenceKey: string | null = null;
  if (clientRequestId) {
    occurrenceKey = buildTraktandumTaskOccurrenceKey(agendaItemId, clientRequestId);
    const existing = await prisma.task.findFirst({
      where: { tenantId: ctx.tenantId, seriesOccurrenceKey: occurrenceKey },
      select: { id: true },
    });
    if (existing) {
      return { taskId: existing.id, deduplicated: true as const };
    }
  }

  if (input.idempotencyKey?.trim()) {
    const prefix = traktandumTaskOccurrenceKeyPrefixForAgenda(agendaItemId);
    const existing = await prisma.task.findFirst({
      where: {
        tenantId: ctx.tenantId,
        contextType: TaskContextType.MEETING,
        contextId: meetingId,
        title,
        seriesOccurrenceKey: { startsWith: prefix },
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
      contextType: TaskContextType.MEETING,
      contextId: meetingId,
    },
  });

  if (occurrenceKey) {
    await prisma.task.update({
      where: { id: task.id },
      data: { seriesOccurrenceKey: occurrenceKey },
    });
  }

  return { taskId: task.id, deduplicated: false as const };
}

export async function createMeetingTraktandumTaskForDecision(
  actor: ActorContext,
  meetingId: string,
  agendaItemId: string,
  decisionId: string,
  input: CreateMeetingTraktandumTaskInput,
) {
  await assertAgendaInMeeting(actor, meetingId, agendaItemId);
  const decision = await prisma.meetingDecision.findFirst({
    where: {
      id: decisionId.trim(),
      meetingId,
      meeting: { tenantId: actor.tenantId ?? undefined },
    },
    select: { id: true, sourceAgendaItemId: true },
  });
  if (!decision) {
    throw new Error("Beschluss gehört nicht zu dieser Sitzung.");
  }
  if (decision.sourceAgendaItemId && decision.sourceAgendaItemId !== agendaItemId) {
    throw new Error("Beschluss gehört nicht zu diesem Traktandum.");
  }

  return createMeetingDecisionTask(actor, meetingId, decisionId, {
    title: input.title,
    description: input.description,
    dueAt: input.dueAt,
    priority: input.priority,
    orgUnitId: input.orgUnitId,
    assigneeUserIds: input.assigneeUserIds,
    idempotencyKey: input.idempotencyKey ?? input.clientRequestId,
  });
}

export async function countAgendaLinkedTasks(tenantId: string, agendaItemIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (agendaItemIds.length === 0) return counts;

  const prefixes = agendaItemIds.map((id) => traktandumTaskOccurrenceKeyPrefixForAgenda(id));
  const tasks = await prisma.task.findMany({
    where: {
      tenantId,
      OR: prefixes.map((prefix) => ({ seriesOccurrenceKey: { startsWith: prefix } })),
    },
    select: { seriesOccurrenceKey: true },
  });

  for (const task of tasks) {
    const agendaItemId = parseAgendaItemIdFromTraktandumTaskOccurrenceKey(task.seriesOccurrenceKey);
    if (!agendaItemId) continue;
    counts.set(agendaItemId, (counts.get(agendaItemId) ?? 0) + 1);
  }

  return counts;
}