import "server-only";

import type { TaskPriority } from "@prisma/client";
import { TaskValidationError } from "@/lib/tasks/errors";

export type MeetingTaskIdempotencyPayload = {
  title: string;
  description?: string | null;
  dueAt?: Date | null;
  priority?: TaskPriority | string | null;
  orgUnitId?: string | null;
  assigneeUserIds?: string[];
};

export type MeetingTaskIdempotencyRow = {
  title: string;
  description: string | null;
  dueAt: Date | null;
  priority: TaskPriority;
  orgUnitId: string | null;
  assignees: { userId: string }[];
};

export function normalizeMeetingTaskIdempotencyPayload(
  input: MeetingTaskIdempotencyPayload,
): Required<Pick<MeetingTaskIdempotencyPayload, "title">> & {
  description: string | null;
  dueAtIso: string | null;
  priority: TaskPriority;
  orgUnitId: string | null;
  assigneeUserIds: string[];
} {
  const title = input.title.trim();
  const description = input.description?.trim() ? input.description.trim() : null;
  const dueAtIso = input.dueAt && !Number.isNaN(input.dueAt.getTime()) ? input.dueAt.toISOString() : null;
  const priority = (input.priority as TaskPriority | undefined) ?? "NORMAL";
  const orgUnitId = input.orgUnitId?.trim() || null;
  const assigneeUserIds = [...new Set((input.assigneeUserIds ?? []).map((id) => id.trim()).filter(Boolean))].sort();
  return { title, description, dueAtIso, priority, orgUnitId, assigneeUserIds };
}

export function meetingTaskIdempotencyPayloadMatches(
  input: MeetingTaskIdempotencyPayload,
  existing: MeetingTaskIdempotencyRow,
): boolean {
  const normalized = normalizeMeetingTaskIdempotencyPayload(input);
  const existingDue = existing.dueAt && !Number.isNaN(existing.dueAt.getTime()) ? existing.dueAt.toISOString() : null;
  const existingAssignees = existing.assignees.map((a) => a.userId).sort();
  return (
    normalized.title === existing.title.trim() &&
    normalized.description === (existing.description?.trim() ? existing.description.trim() : null) &&
    normalized.dueAtIso === existingDue &&
    normalized.priority === existing.priority &&
    normalized.orgUnitId === (existing.orgUnitId?.trim() || null) &&
    normalized.assigneeUserIds.join("\0") === existingAssignees.join("\0")
  );
}

export function assertMeetingTaskIdempotencyPayloadMatches(
  input: MeetingTaskIdempotencyPayload,
  existing: MeetingTaskIdempotencyRow,
): void {
  if (!meetingTaskIdempotencyPayloadMatches(input, existing)) {
    throw new TaskValidationError(
      "Idempotenz-Konflikt: Diese Anfrage-ID wurde bereits mit anderem Inhalt verwendet.",
    );
  }
}

export function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}