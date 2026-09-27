/**
 * SCE-COMM-08 — Team requests & Helfereinsätze (PlatformCommunication-owned).
 */

import type { PlatformCommunicationKind, Prisma } from "@prisma/client";
import {
  PlatformCommunicationRecipientEngagement,
  PlatformCommunicationRequestLifecycle,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canTransitionRecipientEngagement } from "@/lib/communication/platform/engagement";
import {
  createTeamCommunicationDraft,
  publishTeamCommunication,
} from "@/lib/communication/team/team-communication-service";
import {
  isTeamAudiencePreset,
  type TeamAudiencePreset,
} from "@/lib/communication/team/team-audience-presets";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationTenantMismatchError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { recordTeamRequestAudit } from "@/lib/communication/team/team-request-audit";
import type {
  RequestClaimantRow,
  RequestSlotInput,
  TeamRequestAggregateDto,
  TeamRequestSlotCapacityDto,
  TeamRequestTimelineDto,
} from "@/lib/communication/team/team-request-types";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";

export type SendTeamRequestInput = {
  tenantId: string;
  teamId: string;
  senderUserId: string;
  title: string;
  description?: string | null;
  slots: RequestSlotInput[];
  deadlineAt?: string | null;
  audiencePreset?: string;
  eventId?: string | null;
};

const MAX_SLOTS = 30;
const MIN_SLOTS = 1;
const MAX_CAPACITY = 99;

function resolveAudiencePreset(value: string | undefined): TeamAudiencePreset {
  const preset = value?.trim() || "ALL";
  if (!isTeamAudiencePreset(preset)) {
    throw new TeamCommunicationValidationError("invalid audience preset");
  }
  return preset;
}

function sanitizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new TeamCommunicationValidationError("title is required");
  if (trimmed.length > 240) {
    throw new TeamCommunicationValidationError("title exceeds maximum length");
  }
  return trimmed;
}

function sanitizeDescription(description: string | undefined | null): string {
  const trimmed = description?.replace(/\r\n/g, "\n").trim() ?? "";
  if (trimmed.length > 8000) {
    throw new TeamCommunicationValidationError("description exceeds maximum length");
  }
  return trimmed;
}

function normalizeRequestSlots(raw: RequestSlotInput[]): RequestSlotInput[] {
  if (raw.length < MIN_SLOTS) {
    throw new TeamCommunicationValidationError("at least one slot is required");
  }
  if (raw.length > MAX_SLOTS) {
    throw new TeamCommunicationValidationError("too many slots");
  }

  const normalized: RequestSlotInput[] = [];
  for (const slot of raw) {
    const label = slot.label.trim();
    if (!label) throw new TeamCommunicationValidationError("empty slot label");
    const capacity = slot.requiredCapacity ?? 1;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CAPACITY) {
      throw new TeamCommunicationValidationError("invalid slot capacity");
    }
    let startAt: string | null = null;
    let endAt: string | null = null;
    if (slot.startAt) {
      const start = new Date(slot.startAt);
      if (Number.isNaN(start.getTime())) {
        throw new TeamCommunicationValidationError("invalid slot startAt");
      }
      startAt = start.toISOString();
    }
    if (slot.endAt) {
      const end = new Date(slot.endAt);
      if (Number.isNaN(end.getTime())) {
        throw new TeamCommunicationValidationError("invalid slot endAt");
      }
      if (startAt && end.getTime() < new Date(startAt).getTime()) {
        throw new TeamCommunicationValidationError("slot end before start");
      }
      endAt = end.toISOString();
    }
    normalized.push({
      label,
      description: slot.description?.trim() || null,
      requiredCapacity: capacity,
      startAt,
      endAt,
    });
  }
  return normalized;
}

async function assertOptionalEventLink(input: {
  tenantId: string;
  teamId: string;
  eventId: string | null | undefined;
}): Promise<string | null> {
  const eventId = input.eventId?.trim() || null;
  if (!eventId) return null;

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: input.tenantId },
    select: { id: true, teamId: true },
  });
  if (!event) {
    throw new TeamCommunicationValidationError("invalid event reference");
  }
  if (event.teamId && event.teamId !== input.teamId) {
    throw new TeamCommunicationValidationError("event not accessible for team");
  }
  return event.id;
}

function requestIsEffectivelyOpen(input: {
  lifecycle: PlatformCommunicationRequestLifecycle;
  deadlineAt: Date | null;
  now?: Date;
}): boolean {
  if (input.lifecycle !== "OPEN") return false;
  if (!input.deadlineAt) return true;
  const now = input.now ?? new Date();
  return now.getTime() <= input.deadlineAt.getTime();
}

export async function loadPublishedRequestCommunication(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
}) {
  const row = await prisma.platformCommunication.findFirst({
    where: {
      id: input.communicationId,
      tenantId: input.tenantId,
      status: "PUBLISHED",
      kind: "REQUEST",
    },
    include: {
      conversation: { select: { teamId: true } },
      request: {
        include: {
          slots: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!row || !row.request) throw new TeamCommunicationNotFoundError();
  if (row.conversation.teamId !== input.teamId) {
    throw new TeamCommunicationTenantMismatchError();
  }
  return row;
}

async function resolveEligibleSnapshotsForActor(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
}) {
  return prisma.platformCommunicationRecipientSnapshot.findMany({
    where: {
      tenantId: input.tenantId,
      communicationId: input.communicationId,
      deliveryUserId: input.actorUserId,
    },
    select: {
      id: true,
      subjectPersonId: true,
      engagement: true,
      readAt: true,
      acknowledgedAt: true,
      viaGuardianSubstitution: true,
    },
    orderBy: [{ viaGuardianSubstitution: "asc" }, { id: "asc" }],
  });
}

/**
 * One claim action binds to a single dispatch snapshot. When multiple snapshots
 * exist for the same delivery user (guardian substitution), prefer the direct
 * member snapshot; otherwise use the first eligible snapshot.
 */
function pickSnapshotForClaimAction(
  snapshots: Awaited<ReturnType<typeof resolveEligibleSnapshotsForActor>>,
) {
  if (snapshots.length === 0) return null;
  const direct = snapshots.find((s) => !s.viaGuardianSubstitution);
  return direct ?? snapshots[0]!;
}

function computeSlotCapacity(
  slot: {
    id: string;
    sortOrder: number;
    label: string;
    description: string | null;
    requiredCapacity: number;
    startAt: Date | null;
    endAt: Date | null;
  },
  claimedCount: number,
  viewerClaimedSlotIds: Set<string>,
): TeamRequestSlotCapacityDto {
  const claimedCapacity = claimedCount;
  const remainingCapacity = Math.max(slot.requiredCapacity - claimedCapacity, 0);
  return {
    id: slot.id,
    sortOrder: slot.sortOrder,
    label: slot.label,
    description: slot.description,
    requiredCapacity: slot.requiredCapacity,
    claimedCapacity,
    remainingCapacity,
    isFull: remainingCapacity <= 0,
    startAt: slot.startAt?.toISOString() ?? null,
    endAt: slot.endAt?.toISOString() ?? null,
    viewerHasClaim: viewerClaimedSlotIds.has(slot.id),
  };
}

function computeAggregate(slots: TeamRequestSlotCapacityDto[]): TeamRequestAggregateDto {
  let totalRequired = 0;
  let totalClaimed = 0;
  let fullSlotCount = 0;
  for (const slot of slots) {
    totalRequired += slot.requiredCapacity;
    totalClaimed += slot.claimedCapacity;
    if (slot.isFull) fullSlotCount += 1;
  }
  const openSlotCount = slots.length - fullSlotCount;
  const totalRemaining = Math.max(totalRequired - totalClaimed, 0);
  return {
    totalRequired,
    totalClaimed,
    totalRemaining,
    fullSlotCount,
    openSlotCount,
    isFull: slots.length > 0 && openSlotCount === 0,
  };
}

export async function sendTeamRequestCommunication(
  input: SendTeamRequestInput,
): Promise<{ id: string; recipientCount: number }> {
  const title = sanitizeTitle(input.title);
  const description = sanitizeDescription(input.description);
  const audiencePreset = resolveAudiencePreset(input.audiencePreset);
  const slots = normalizeRequestSlots(input.slots);
  const eventId = await assertOptionalEventLink({
    tenantId: input.tenantId,
    teamId: input.teamId,
    eventId: input.eventId,
  });

  let deadlineAt: Date | null = null;
  if (input.deadlineAt) {
    deadlineAt = new Date(input.deadlineAt);
    if (Number.isNaN(deadlineAt.getTime())) {
      throw new TeamCommunicationValidationError("invalid deadline");
    }
  }

  const draft = await createTeamCommunicationDraft({
    tenantId: input.tenantId,
    teamId: input.teamId,
    senderUserId: input.senderUserId,
    kind: "REQUEST",
    bodyText: description || " ",
    subject: title,
    audiencePreset,
    allowEmptyBody: true,
  });

  await prisma.$transaction(async (tx) => {
    const request = await tx.platformCommunicationRequest.create({
      data: {
        tenantId: input.tenantId,
        communicationId: draft.id,
        lifecycle: "OPEN",
        deadlineAt,
        eventId,
        slots: {
          create: slots.map((slot, index) => ({
            tenantId: input.tenantId,
            sortOrder: index,
            label: slot.label,
            description: slot.description,
            requiredCapacity: slot.requiredCapacity ?? 1,
            startAt: slot.startAt ? new Date(slot.startAt) : null,
            endAt: slot.endAt ? new Date(slot.endAt) : null,
          })),
        },
      },
      select: { id: true },
    });

    await recordTeamRequestAudit({
      tenantId: input.tenantId,
      actorUserId: input.senderUserId,
      action: "REQUEST_CREATED",
      communicationId: draft.id,
      teamId: input.teamId,
      requestId: request.id,
    });
  });

  const published = await publishTeamCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    communicationId: draft.id,
    senderUserId: input.senderUserId,
    audiencePreset,
  });

  await recordTeamRequestAudit({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    action: "REQUEST_PUBLISHED",
    communicationId: draft.id,
    teamId: input.teamId,
  });

  return published;
}

export async function closeTeamRequest(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  actorUserId: string;
  viewerCanSend: boolean;
}): Promise<void> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedRequestCommunication(input);
  if (row.request!.lifecycle === "CLOSED") return;

  await prisma.platformCommunicationRequest.update({
    where: { id: row.request!.id },
    data: { lifecycle: "CLOSED", closedAt: new Date() },
  });

  await recordTeamRequestAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "REQUEST_CLOSED",
    communicationId: row.id,
    teamId: input.teamId,
    requestId: row.request!.id,
  });
}

async function advanceEngagementToResponded(input: {
  tx: Prisma.TransactionClient;
  snapshot: {
    id: string;
    engagement: PlatformCommunicationRecipientEngagement;
    readAt: Date | null;
    acknowledgedAt: Date | null;
  };
  now: Date;
}) {
  if (canTransitionRecipientEngagement(input.snapshot.engagement, "RESPONDED")) {
    await input.tx.platformCommunicationRecipientSnapshot.update({
      where: { id: input.snapshot.id },
      data: {
        engagement: "RESPONDED",
        readAt: input.snapshot.readAt ?? input.now,
      },
    });
  }
}

export async function claimTeamRequestSlot(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  slotId: string;
  actorUserId: string;
}): Promise<void> {
  const row = await loadPublishedRequestCommunication(input);
  const request = row.request!;
  const now = new Date();

  if (!requestIsEffectivelyOpen({ lifecycle: request.lifecycle, deadlineAt: request.deadlineAt, now })) {
    throw new TeamCommunicationValidationError("request is closed");
  }

  const slot = request.slots.find((s) => s.id === input.slotId);
  if (!slot) throw new TeamCommunicationValidationError("invalid slot");

  const snapshots = await resolveEligibleSnapshotsForActor({
    tenantId: input.tenantId,
    communicationId: row.id,
    actorUserId: input.actorUserId,
  });
  const snapshot = pickSnapshotForClaimAction(snapshots);
  if (!snapshot) throw new TeamCommunicationForbiddenError();

  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      Array<{ id: string; requestId: string; requiredCapacity: number }>
    >`
      SELECT s."id", s."requestId", s."requiredCapacity"
      FROM "PlatformCommunicationRequestSlot" s
      INNER JOIN "PlatformCommunicationRequest" r ON r."id" = s."requestId"
      WHERE s."id" = ${input.slotId}
        AND s."tenantId" = ${input.tenantId}
        AND r."communicationId" = ${row.id}
      FOR UPDATE
    `;
    const lockedSlot = locked[0];
    if (!lockedSlot) throw new TeamCommunicationValidationError("invalid slot");

    const existingForDeliveryUser = await tx.platformCommunicationRequestClaim.findFirst({
      where: {
        slotId: input.slotId,
        tenantId: input.tenantId,
        recipientSnapshot: {
          deliveryUserId: input.actorUserId,
          communicationId: row.id,
        },
      },
      select: { id: true, recipientSnapshotId: true },
    });
    if (existingForDeliveryUser) {
      if (existingForDeliveryUser.recipientSnapshotId === snapshot.id) return;
      throw new TeamCommunicationValidationError("already claimed for this slot");
    }

    const claimCount = await tx.platformCommunicationRequestClaim.count({
      where: { tenantId: input.tenantId, slotId: input.slotId },
    });
    if (claimCount >= lockedSlot.requiredCapacity) {
      throw new TeamCommunicationValidationError("slot is full");
    }

    await tx.platformCommunicationRequestClaim.create({
      data: {
        tenantId: input.tenantId,
        slotId: input.slotId,
        recipientSnapshotId: snapshot.id,
      },
    });

    await advanceEngagementToResponded({ tx, snapshot, now });
  });

  await recordTeamRequestAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "REQUEST_SLOT_CLAIMED",
    communicationId: row.id,
    teamId: input.teamId,
    requestId: request.id,
    slotId: input.slotId,
    recipientSnapshotId: snapshot.id,
  });
}

export async function unclaimTeamRequestSlot(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  slotId: string;
  actorUserId: string;
}): Promise<void> {
  const row = await loadPublishedRequestCommunication(input);
  const request = row.request!;
  const now = new Date();

  if (!requestIsEffectivelyOpen({ lifecycle: request.lifecycle, deadlineAt: request.deadlineAt, now })) {
    throw new TeamCommunicationValidationError("request is closed");
  }

  if (!request.slots.some((s) => s.id === input.slotId)) {
    throw new TeamCommunicationValidationError("invalid slot");
  }

  const deleted = await prisma.platformCommunicationRequestClaim.deleteMany({
    where: {
      tenantId: input.tenantId,
      slotId: input.slotId,
      recipientSnapshot: {
        communicationId: row.id,
        deliveryUserId: input.actorUserId,
      },
    },
  });

  if (deleted.count === 0) {
    throw new TeamCommunicationNotFoundError();
  }

  await recordTeamRequestAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "REQUEST_SLOT_UNCLAIMED",
    communicationId: row.id,
    teamId: input.teamId,
    requestId: request.id,
    slotId: input.slotId,
  });
}

export async function getRequestAggregateStatus(input: {
  tenantId: string;
  requestId: string;
}): Promise<TeamRequestAggregateDto & { slots: TeamRequestSlotCapacityDto[] }> {
  const request = await prisma.platformCommunicationRequest.findFirst({
    where: { id: input.requestId, tenantId: input.tenantId },
    include: { slots: { orderBy: { sortOrder: "asc" } } },
  });
  if (!request) throw new TeamCommunicationNotFoundError();

  const slotIds = request.slots.map((s) => s.id);
  const claimCounts =
    slotIds.length === 0
      ? []
      : await prisma.platformCommunicationRequestClaim.groupBy({
          by: ["slotId"],
          where: { tenantId: input.tenantId, slotId: { in: slotIds } },
          _count: { _all: true },
        });
  const countBySlot = new Map(claimCounts.map((row) => [row.slotId, row._count._all]));

  const slots = request.slots.map((slot) =>
    computeSlotCapacity(slot, countBySlot.get(slot.id) ?? 0, new Set()),
  );
  const aggregate = computeAggregate(slots);
  return { ...aggregate, slots };
}

export async function listRequestClaimantDetail(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  viewerCanSend: boolean;
}): Promise<RequestClaimantRow[]> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedRequestCommunication(input);
  const request = row.request!;

  const claims = await prisma.platformCommunicationRequestClaim.findMany({
    where: {
      tenantId: input.tenantId,
      slot: { requestId: request.id },
    },
    orderBy: [{ claimedAt: "asc" }],
    select: {
      id: true,
      slotId: true,
      recipientSnapshotId: true,
      claimedAt: true,
      recipientSnapshot: {
        select: {
          subjectPersonId: true,
          deliveryUserId: true,
          viaGuardianSubstitution: true,
          subjectPerson: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return claims.map((claim) => ({
    claimId: claim.id,
    slotId: claim.slotId,
    recipientSnapshotId: claim.recipientSnapshotId,
    subjectPersonId: claim.recipientSnapshot.subjectPersonId,
    subjectName: `${claim.recipientSnapshot.subjectPerson.firstName} ${claim.recipientSnapshot.subjectPerson.lastName}`.trim(),
    deliveryUserId: claim.recipientSnapshot.deliveryUserId,
    viaGuardianSubstitution: claim.recipientSnapshot.viaGuardianSubstitution,
    claimedAt: claim.claimedAt.toISOString(),
  }));
}

export async function listRequestNonRespondedSnapshotIds(input: {
  tenantId: string;
  communicationId: string;
}): Promise<string[]> {
  const request = await prisma.platformCommunicationRequest.findFirst({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
    select: { id: true },
  });
  if (!request) return [];

  const snapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
    select: {
      id: true,
      requestClaims: {
        where: { slot: { requestId: request.id } },
        select: { id: true },
        take: 1,
      },
    },
  });

  return snapshots.filter((s) => s.requestClaims.length === 0).map((s) => s.id);
}

export async function listRequestsWithOpenCapacity(input: {
  tenantId: string;
  communicationIds: readonly string[];
}): Promise<string[]> {
  if (input.communicationIds.length === 0) return [];

  const requests = await prisma.platformCommunicationRequest.findMany({
    where: {
      tenantId: input.tenantId,
      communicationId: { in: [...input.communicationIds] },
      lifecycle: "OPEN",
    },
    include: { slots: true },
  });

  const openCommunicationIds: string[] = [];
  for (const request of requests) {
    if (request.deadlineAt && request.deadlineAt.getTime() < Date.now()) continue;
    const slotIds = request.slots.map((s) => s.id);
    const claimCounts =
      slotIds.length === 0
        ? []
        : await prisma.platformCommunicationRequestClaim.groupBy({
            by: ["slotId"],
            where: { tenantId: input.tenantId, slotId: { in: slotIds } },
            _count: { _all: true },
          });
    const countBySlot = new Map(claimCounts.map((row) => [row.slotId, row._count._all]));
    const hasOpen = request.slots.some(
      (slot) => (countBySlot.get(slot.id) ?? 0) < slot.requiredCapacity,
    );
    if (hasOpen) openCommunicationIds.push(request.communicationId);
  }
  return openCommunicationIds;
}

export async function listRequestSlotsWithOpenCapacity(input: {
  tenantId: string;
  communicationId: string;
}): Promise<string[]> {
  const request = await prisma.platformCommunicationRequest.findFirst({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
    include: { slots: true },
  });
  if (!request || request.lifecycle !== "OPEN") return [];
  if (request.deadlineAt && request.deadlineAt.getTime() < Date.now()) return [];

  const slotIds = request.slots.map((s) => s.id);
  const claimCounts =
    slotIds.length === 0
      ? []
      : await prisma.platformCommunicationRequestClaim.groupBy({
          by: ["slotId"],
          where: { tenantId: input.tenantId, slotId: { in: slotIds } },
          _count: { _all: true },
        });
  const countBySlot = new Map(claimCounts.map((row) => [row.slotId, row._count._all]));

  return request.slots
    .filter((slot) => (countBySlot.get(slot.id) ?? 0) < slot.requiredCapacity)
    .map((slot) => slot.id);
}

export async function buildRequestTimelineDto(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  kind: PlatformCommunicationKind;
  viewerUserId: string;
  viewerCanSend: boolean;
}): Promise<TeamRequestTimelineDto | null> {
  if (input.kind !== "REQUEST") return null;

  const request = await prisma.platformCommunicationRequest.findFirst({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
    include: { slots: { orderBy: { sortOrder: "asc" } } },
  });
  if (!request) return null;

  const now = new Date();
  const isOpen = requestIsEffectivelyOpen({
    lifecycle: request.lifecycle,
    deadlineAt: request.deadlineAt,
    now,
  });
  const isExpired =
    request.deadlineAt !== null &&
    request.deadlineAt.getTime() < now.getTime() &&
    request.lifecycle === "OPEN";

  const snapshots = await resolveEligibleSnapshotsForActor({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
    actorUserId: input.viewerUserId,
  });
  const snapshotIds = snapshots.map((s) => s.id);

  const slotIds = request.slots.map((s) => s.id);
  const [claimCounts, viewerClaims] = await Promise.all([
    slotIds.length === 0
      ? Promise.resolve([])
      : prisma.platformCommunicationRequestClaim.groupBy({
          by: ["slotId"],
          where: { tenantId: input.tenantId, slotId: { in: slotIds } },
          _count: { _all: true },
        }),
    snapshotIds.length === 0
      ? Promise.resolve([])
      : prisma.platformCommunicationRequestClaim.findMany({
          where: {
            tenantId: input.tenantId,
            slotId: { in: slotIds },
            recipientSnapshotId: { in: snapshotIds },
          },
          select: { slotId: true },
        }),
  ]);

  const countBySlot = new Map(claimCounts.map((row) => [row.slotId, row._count._all]));
  const viewerClaimedSlotIds = new Set(viewerClaims.map((c) => c.slotId));

  const slots = request.slots.map((slot) =>
    computeSlotCapacity(slot, countBySlot.get(slot.id) ?? 0, viewerClaimedSlotIds),
  );
  const aggregate = computeAggregate(slots);

  return {
    requestId: request.id,
    kind: "REQUEST",
    lifecycle: request.lifecycle,
    deadlineAt: request.deadlineAt?.toISOString() ?? null,
    closedAt: request.closedAt?.toISOString() ?? null,
    eventId: request.eventId,
    isExpired,
    isOpen,
    canClaim: isOpen && snapshots.length > 0,
    canManage: input.viewerCanSend,
    canViewClaimantDetail: input.viewerCanSend,
    slots,
    aggregate,
    viewerClaimedSlotIds: [...viewerClaimedSlotIds],
  };
}

export async function loadRequestTimelineBatch(input: {
  tenantId: string;
  teamId: string;
  items: { communicationId: string; kind: PlatformCommunicationKind }[];
  viewerUserId: string;
  viewerCanSend: boolean;
}): Promise<Map<string, TeamRequestTimelineDto>> {
  const requestItems = input.items.filter((i) => i.kind === "REQUEST");
  const map = new Map<string, TeamRequestTimelineDto>();
  await Promise.all(
    requestItems.map(async (item) => {
      const dto = await buildRequestTimelineDto({
        tenantId: input.tenantId,
        teamId: input.teamId,
        communicationId: item.communicationId,
        kind: item.kind,
        viewerUserId: input.viewerUserId,
        viewerCanSend: input.viewerCanSend,
      });
      if (dto) map.set(item.communicationId, dto);
    }),
  );
  return map;
}

export async function canInspectRequestClaimantDetail(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  viewerUserId: string;
  viewerCanSend: boolean;
}): Promise<boolean> {
  if (input.viewerCanSend) return true;
  const row = await loadPublishedRequestCommunication(input);
  const senderPersonId = row.senderPersonId;
  if (!senderPersonId) return false;
  const viewerPersonId = await resolvePersonIdForUser(input.viewerUserId, input.tenantId).catch(
    () => null,
  );
  return viewerPersonId !== null && viewerPersonId === senderPersonId;
}

/**
 * Future explicit bridge to canonical Aufgaben (COMM-08 defers implementation).
 */
export type RequestClaimToAufgabeSeam = {
  communicationId: string;
  slotId: string;
  claimId: string;
};
