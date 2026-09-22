import type { Prisma, RequirementStatus } from "@prisma/client";
import { TASK_DUE_SOON_LEAD_MS } from "@/lib/notifications/constants";

export type RequirementRecipientDeadlineInput = {
  requirementStatus: RequirementStatus;
  dueAt: Date | null;
  recipientResolutionStatus: "OPEN" | "RESOLVED";
  recipientRemovedAt: Date | null;
  now?: Date;
};

/** Canonical overdue: ACTIVE requirement, OPEN non-removed recipient, dueAt <= now. */
export function isRequirementRecipientOverdue(input: RequirementRecipientDeadlineInput): boolean {
  const now = input.now ?? new Date();
  return (
    input.requirementStatus === "ACTIVE" &&
    input.recipientResolutionStatus === "OPEN" &&
    input.recipientRemovedAt === null &&
    input.dueAt !== null &&
    input.dueAt.getTime() <= now.getTime()
  );
}

export function isRequirementDueAtOverdue(dueAt: Date, now: Date = new Date()): boolean {
  return dueAt.getTime() <= now.getTime();
}

/** Reminder window: dueAt > now AND dueAt <= now + lead (default 24h). */
export function isRequirementDueAtInReminderWindow(
  dueAt: Date,
  now: Date = new Date(),
  leadMs: number = TASK_DUE_SOON_LEAD_MS,
): boolean {
  const upper = now.getTime() + leadMs;
  const t = dueAt.getTime();
  return t > now.getTime() && t <= upper;
}

export function openRequirementRecipientOverdueWhere(
  now: Date,
): Prisma.RequirementRecipientWhereInput {
  return {
    removedAt: null,
    resolutionStatus: "OPEN",
    requirement: {
      status: "ACTIVE",
      dueAt: { lte: now },
    },
  };
}

export function openRequirementRecipientReminderWhere(
  now: Date,
  leadMs: number = TASK_DUE_SOON_LEAD_MS,
): Prisma.RequirementRecipientWhereInput {
  const dueSoonUpper = new Date(now.getTime() + leadMs);
  return {
    removedAt: null,
    resolutionStatus: "OPEN",
    requirement: {
      status: "ACTIVE",
      dueAt: { gt: now, lte: dueSoonUpper },
    },
  };
}
