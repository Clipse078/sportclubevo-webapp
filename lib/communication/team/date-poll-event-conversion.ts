/**
 * SCE-COMM-07 — Create canonical OTHER Event from a Date Poll winning option.
 *
 * Canonical Event creation in this repository uses direct `prisma.event.create`
 * (same contract as planner manual OTHER entries); poll conversion mirrors that shape.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { resolveEventReviewDecision } from "@/lib/workflow/event-review-policy";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

async function assertCanCreateOtherEvent(userId: string, tenantId: string): Promise<void> {
  const resolver = createEffectivePermissionResolver(prisma);
  const { platform, tenant } = await resolver.getEffectivePermissions({ userId, tenantId });
  if (
    !platform.includes(PERMISSIONS.EVENTS_MANAGE) &&
    !tenant.includes(PERMISSIONS.EVENTS_MANAGE)
  ) {
    throw new TeamCommunicationForbiddenError("EVENT_CREATE_DENIED");
  }
}

async function resolveActiveSeasonId(): Promise<string> {
  const active = await prisma.season.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { startDate: "desc" },
  });
  if (active) return active.id;
  const fallback = await prisma.season.findFirst({
    select: { id: true },
    orderBy: { startDate: "desc" },
  });
  if (!fallback) throw new Error("no season available");
  return fallback.id;
}

export type CreateOtherEventFromDatePollInput = {
  tenantId: string;
  teamId: string;
  actorUserId: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  description: string | null;
};

export async function createOtherEventFromDatePoll(
  input: CreateOtherEventFromDatePollInput,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  await assertCanCreateOtherEvent(input.actorUserId, input.tenantId);

  const db = tx ?? prisma;

  const team = await db.team.findFirst({
    where: { id: input.teamId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!team) throw new TeamCommunicationForbiddenError();

  const seasonId = await resolveActiveSeasonId();

  const eventReviewDecision = resolveEventReviewDecision("create_event", {
    canCreate: true,
    canReview: false,
    canApprove: false,
    canPublish: false,
    canDirectManage: false,
    canReviewSeries: false,
  });

  const initialReviewStage = eventReviewDecision.allowsDirectExecution ? "APPROVED" : "SUBMITTED";

  const created = await db.event.create({
    data: {
      tenantId: input.tenantId,
      seasonId,
      teamId: input.teamId,
      type: "OTHER",
      source: "MANUAL",
      status: "SCHEDULED",
      reviewStage: initialReviewStage,
      reviewRequestedAt: eventReviewDecision.requiresReview ? new Date() : null,
      reviewedAt: eventReviewDecision.allowsDirectExecution ? new Date() : null,
      approvedByUserId: eventReviewDecision.allowsDirectExecution ? input.actorUserId : null,
      title: input.title,
      description: input.description,
      startAt: input.startAt,
      endAt: input.endAt,
      createdByUserId: input.actorUserId,
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
      trainingsplanVisible: false,
      teamPageVisible: false,
    },
    select: { id: true },
  });

  return created.id;
}
