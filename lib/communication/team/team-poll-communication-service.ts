/**
 * SCE-COMM-07 — Team polls & date polls (PlatformCommunication-owned).
 */

import type { PlatformCommunicationKind } from "@prisma/client";
import { PlatformCommunicationPollLifecycle } from "@prisma/client";
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
import { recordTeamPollAudit } from "@/lib/communication/team/team-poll-audit";
import {
  assertPollKind,
  isPollMode,
  isPollResultsVisibility,
  type PollKind,
  type PollOptionInput,
  type TeamPollAggregateResultsDto,
  type TeamPollOptionDto,
  type TeamPollTimelineDto,
} from "@/lib/communication/team/team-poll-types";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";
import { createOtherEventFromDatePoll } from "@/lib/communication/team/date-poll-event-conversion";

export type SendTeamPollInput = {
  tenantId: string;
  teamId: string;
  senderUserId: string;
  kind: string;
  question: string;
  description?: string | null;
  options: PollOptionInput[];
  mode?: string;
  deadlineAt?: string | null;
  resultsVisibility?: string;
  audiencePreset?: string;
};

export type SubmitPollResponseInput = {
  tenantId: string;
  teamId: string;
  communicationId: string;
  actorUserId: string;
  optionIds: string[];
};

export type PollRecipientResponseRow = {
  snapshotId: string;
  subjectPersonId: string;
  subjectName: string;
  deliveryUserId: string;
  viaGuardianSubstitution: boolean;
  optionIds: string[];
  respondedAt: string | null;
};

const MAX_OPTIONS = 20;
const MIN_OPTIONS = 2;

function resolveAudiencePreset(value: string | undefined): TeamAudiencePreset {
  const preset = value?.trim() || "ALL";
  if (!isTeamAudiencePreset(preset)) {
    throw new TeamCommunicationValidationError("invalid audience preset");
  }
  return preset;
}

function sanitizeQuestion(question: string): string {
  const trimmed = question.trim();
  if (!trimmed) throw new TeamCommunicationValidationError("question is required");
  if (trimmed.length > 240) {
    throw new TeamCommunicationValidationError("question exceeds maximum length");
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

function normalizePollOptions(kind: PollKind, raw: PollOptionInput[]): PollOptionInput[] {
  if (raw.length < MIN_OPTIONS) {
    throw new TeamCommunicationValidationError("at least two options are required");
  }
  if (raw.length > MAX_OPTIONS) {
    throw new TeamCommunicationValidationError("too many options");
  }

  const normalized: PollOptionInput[] = [];
  const seenLabels = new Set<string>();
  const seenStarts = new Set<string>();

  for (const option of raw) {
    if (kind === "POLL") {
      if (!("label" in option)) {
        throw new TeamCommunicationValidationError("poll options require labels");
      }
      const label = option.label.trim();
      if (!label) throw new TeamCommunicationValidationError("empty poll option");
      const key = label.toLowerCase();
      if (seenLabels.has(key)) {
        throw new TeamCommunicationValidationError("duplicate poll option");
      }
      seenLabels.add(key);
      normalized.push({ label });
    } else {
      if (!("startAt" in option)) {
        throw new TeamCommunicationValidationError("date poll options require startAt");
      }
      const startAt = option.startAt.trim();
      const start = new Date(startAt);
      if (Number.isNaN(start.getTime())) {
        throw new TeamCommunicationValidationError("invalid date poll startAt");
      }
      let endAt: Date | null = null;
      if (option.endAt) {
        endAt = new Date(option.endAt);
        if (Number.isNaN(endAt.getTime())) {
          throw new TeamCommunicationValidationError("invalid date poll endAt");
        }
        if (endAt.getTime() < start.getTime()) {
          throw new TeamCommunicationValidationError("date poll end before start");
        }
      }
      const key = `${start.toISOString()}|${endAt?.toISOString() ?? ""}`;
      if (seenStarts.has(key)) {
        throw new TeamCommunicationValidationError("duplicate date poll option");
      }
      seenStarts.add(key);
      normalized.push({
        startAt: start.toISOString(),
        endAt: endAt?.toISOString() ?? null,
      });
    }
  }
  return normalized;
}

function pollIsEffectivelyOpen(input: {
  lifecycle: PlatformCommunicationPollLifecycle;
  deadlineAt: Date | null;
  now?: Date;
}): boolean {
  if (input.lifecycle !== "OPEN") return false;
  if (!input.deadlineAt) return true;
  const now = input.now ?? new Date();
  return now.getTime() <= input.deadlineAt.getTime();
}

async function loadPublishedPollCommunication(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
}) {
  const row = await prisma.platformCommunication.findFirst({
    where: {
      id: input.communicationId,
      tenantId: input.tenantId,
      status: "PUBLISHED",
      kind: { in: ["POLL", "DATE_POLL"] },
    },
    include: {
      conversation: { select: { teamId: true } },
      poll: {
        include: {
          options: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!row || !row.poll) throw new TeamCommunicationNotFoundError();
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
  });
}

export async function sendTeamPollCommunication(
  input: SendTeamPollInput,
): Promise<{ id: string; recipientCount: number }> {
  const kind = assertPollKind(input.kind);
  const question = sanitizeQuestion(input.question);
  const description = sanitizeDescription(input.description);
  const mode = input.mode?.trim() || "SINGLE";
  if (!isPollMode(mode)) throw new TeamCommunicationValidationError("invalid poll mode");
  const resultsVisibility = input.resultsVisibility?.trim() || "AFTER_CLOSE";
  if (!isPollResultsVisibility(resultsVisibility)) {
    throw new TeamCommunicationValidationError("invalid results visibility");
  }
  const audiencePreset = resolveAudiencePreset(input.audiencePreset);
  const options = normalizePollOptions(kind, input.options);

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
    kind,
    bodyText: description || " ",
    subject: question,
    audiencePreset,
    allowEmptyBody: true,
  });

  await prisma.$transaction(async (tx) => {
    const poll = await tx.platformCommunicationPoll.create({
      data: {
        tenantId: input.tenantId,
        communicationId: draft.id,
        mode,
        resultsVisibility,
        lifecycle: "OPEN",
        deadlineAt,
        options: {
          create: options.map((opt, index) => {
            if ("label" in opt) {
              return {
                tenantId: input.tenantId,
                sortOrder: index,
                label: opt.label,
              };
            }
            return {
              tenantId: input.tenantId,
              sortOrder: index,
              startAt: new Date(opt.startAt),
              endAt: opt.endAt ? new Date(opt.endAt) : null,
            };
          }),
        },
      },
      select: { id: true },
    });

    await recordTeamPollAudit({
      tenantId: input.tenantId,
      actorUserId: input.senderUserId,
      action: "POLL_CREATED",
      communicationId: draft.id,
      teamId: input.teamId,
      kind,
      pollId: poll.id,
    });
  });

  const published = await publishTeamCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    communicationId: draft.id,
    senderUserId: input.senderUserId,
    audiencePreset,
  });

  await recordTeamPollAudit({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    action: "POLL_PUBLISHED",
    communicationId: draft.id,
    teamId: input.teamId,
    kind,
  });

  return published;
}

export async function closeTeamPoll(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  actorUserId: string;
  viewerCanSend: boolean;
}): Promise<void> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedPollCommunication(input);
  if (row.poll!.lifecycle === "CLOSED") return;

  await prisma.platformCommunicationPoll.update({
    where: { id: row.poll!.id },
    data: { lifecycle: "CLOSED", closedAt: new Date() },
  });

  await recordTeamPollAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "POLL_CLOSED",
    communicationId: row.id,
    teamId: input.teamId,
    kind: row.kind,
    pollId: row.poll!.id,
  });
}

export async function submitTeamPollResponse(input: SubmitPollResponseInput): Promise<void> {
  const row = await loadPublishedPollCommunication(input);
  const poll = row.poll!;
  const now = new Date();

  if (!pollIsEffectivelyOpen({ lifecycle: poll.lifecycle, deadlineAt: poll.deadlineAt, now })) {
    throw new TeamCommunicationValidationError("poll is closed");
  }

  const optionIds = [...new Set(input.optionIds.filter(Boolean))];
  if (optionIds.length === 0) {
    throw new TeamCommunicationValidationError("at least one option is required");
  }
  if (poll.mode === "SINGLE" && optionIds.length !== 1) {
    throw new TeamCommunicationValidationError("single-choice poll allows one option");
  }

  const validOptionIds = new Set(poll.options.map((o) => o.id));
  for (const optionId of optionIds) {
    if (!validOptionIds.has(optionId)) {
      throw new TeamCommunicationValidationError("invalid option");
    }
  }

  const snapshots = await resolveEligibleSnapshotsForActor({
    tenantId: input.tenantId,
    communicationId: row.id,
    actorUserId: input.actorUserId,
  });
  if (snapshots.length === 0) throw new TeamCommunicationForbiddenError();

  await prisma.$transaction(async (tx) => {
    for (const snap of snapshots) {
      if (poll.mode === "SINGLE") {
        await tx.platformCommunicationPollResponse.deleteMany({
          where: { pollId: poll.id, recipientSnapshotId: snap.id },
        });
      } else {
        await tx.platformCommunicationPollResponse.deleteMany({
          where: {
            pollId: poll.id,
            recipientSnapshotId: snap.id,
            optionId: { notIn: optionIds },
          },
        });
      }

      for (const optionId of optionIds) {
        await tx.platformCommunicationPollResponse.upsert({
          where: {
            pollId_recipientSnapshotId_optionId: {
              pollId: poll.id,
              recipientSnapshotId: snap.id,
              optionId,
            },
          },
          create: {
            tenantId: input.tenantId,
            pollId: poll.id,
            optionId,
            recipientSnapshotId: snap.id,
          },
          update: {},
        });
      }

      if (canTransitionRecipientEngagement(snap.engagement, "RESPONDED")) {
        await tx.platformCommunicationRecipientSnapshot.update({
          where: { id: snap.id },
          data: {
            engagement: "RESPONDED",
            readAt: snap.readAt ?? now,
          },
        });
      }
    }
  });

  await recordTeamPollAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "POLL_RESPONSE_SUBMITTED",
    communicationId: row.id,
    teamId: input.teamId,
    kind: row.kind,
    pollId: poll.id,
  });
}

export async function getPollAggregateResults(input: {
  tenantId: string;
  pollId: string;
}): Promise<TeamPollAggregateResultsDto> {
  const poll = await prisma.platformCommunicationPoll.findFirst({
    where: { id: input.pollId, tenantId: input.tenantId },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  if (!poll) throw new TeamCommunicationNotFoundError();

  const communicationId = poll.communicationId;
  const eligibleRecipientCount = await prisma.platformCommunicationRecipientSnapshot.count({
    where: { tenantId: input.tenantId, communicationId },
  });

  const respondedGroups = await prisma.platformCommunicationPollResponse.groupBy({
    by: ["recipientSnapshotId"],
    where: { tenantId: input.tenantId, pollId: poll.id },
  });
  const respondedRecipientCount = respondedGroups.length;

  const optionCounts = await prisma.platformCommunicationPollResponse.groupBy({
    by: ["optionId"],
    where: { tenantId: input.tenantId, pollId: poll.id },
    _count: { _all: true },
  });
  const countByOption = new Map(optionCounts.map((row) => [row.optionId, row._count._all]));

  let totalSelectionCount = 0;
  const options: TeamPollOptionDto[] = poll.options.map((opt) => {
    const responseCount = countByOption.get(opt.id) ?? 0;
    totalSelectionCount += responseCount;
    return {
      id: opt.id,
      sortOrder: opt.sortOrder,
      label: opt.label,
      startAt: opt.startAt?.toISOString() ?? null,
      endAt: opt.endAt?.toISOString() ?? null,
      responseCount,
    };
  });

  return {
    eligibleRecipientCount,
    respondedRecipientCount,
    notRespondedCount: Math.max(eligibleRecipientCount - respondedRecipientCount, 0),
    totalSelectionCount,
    options,
  };
}

export async function listPollRecipientResponses(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
}): Promise<PollRecipientResponseRow[]> {
  const row = await loadPublishedPollCommunication(input);
  const poll = row.poll!;

  const snapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: { tenantId: input.tenantId, communicationId: row.id },
    orderBy: [{ subjectPersonId: "asc" }],
    select: {
      id: true,
      subjectPersonId: true,
      deliveryUserId: true,
      viaGuardianSubstitution: true,
      subjectPerson: { select: { firstName: true, lastName: true } },
      pollResponses: {
        where: { pollId: poll.id },
        select: { optionId: true, updatedAt: true },
      },
    },
  });

  return snapshots.map((snap) => ({
    snapshotId: snap.id,
    subjectPersonId: snap.subjectPersonId,
    subjectName: `${snap.subjectPerson.firstName} ${snap.subjectPerson.lastName}`.trim(),
    deliveryUserId: snap.deliveryUserId,
    viaGuardianSubstitution: snap.viaGuardianSubstitution,
    optionIds: snap.pollResponses.map((r) => r.optionId),
    respondedAt:
      snap.pollResponses.length > 0
        ? snap.pollResponses
            .map((r) => r.updatedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0]!
            .toISOString()
        : null,
  }));
}

export async function listPollNonRespondedSnapshotIds(input: {
  tenantId: string;
  communicationId: string;
}): Promise<string[]> {
  const poll = await prisma.platformCommunicationPoll.findFirst({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
    select: { id: true },
  });
  if (!poll) return [];

  const snapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
    select: {
      id: true,
      pollResponses: { where: { pollId: poll.id }, select: { id: true }, take: 1 },
    },
  });

  return snapshots.filter((s) => s.pollResponses.length === 0).map((s) => s.id);
}

export async function selectDatePollWinner(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  optionId: string;
  actorUserId: string;
  viewerCanSend: boolean;
}): Promise<void> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedPollCommunication(input);
  if (row.kind !== "DATE_POLL") {
    throw new TeamCommunicationValidationError("winner selection only for date polls");
  }
  const poll = row.poll!;
  const valid = poll.options.some((o) => o.id === input.optionId);
  if (!valid) throw new TeamCommunicationValidationError("invalid option");

  await prisma.platformCommunicationPoll.update({
    where: { id: poll.id },
    data: { selectedOptionId: input.optionId },
  });

  await recordTeamPollAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "DATE_POLL_OPTION_SELECTED",
    communicationId: row.id,
    teamId: input.teamId,
    kind: row.kind,
    pollId: poll.id,
  });
}

export async function createEventFromDatePollCommunication(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  actorUserId: string;
  viewerCanSend: boolean;
  titleOverride?: string | null;
}): Promise<{ eventId: string; created: boolean }> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedPollCommunication(input);
  if (row.kind !== "DATE_POLL") {
    throw new TeamCommunicationValidationError("event conversion only for date polls");
  }
  const poll = row.poll!;
  if (!poll.selectedOptionId) {
    throw new TeamCommunicationValidationError("winning option must be selected first");
  }
  if (poll.createdEventId) {
    return { eventId: poll.createdEventId, created: false };
  }

  const selected = poll.options.find((o) => o.id === poll.selectedOptionId);
  if (!selected?.startAt) {
    throw new TeamCommunicationValidationError("selected option has no start time");
  }

  const eventPayload = {
    tenantId: input.tenantId,
    teamId: input.teamId,
    actorUserId: input.actorUserId,
    title: input.titleOverride?.trim() || row.subject?.trim() || "Termin",
    startAt: selected.startAt,
    endAt: selected.endAt,
    description: row.bodyText.trim() || null,
  };

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      Array<{ createdEventId: string | null; selectedOptionId: string | null }>
    >`
      SELECT "createdEventId", "selectedOptionId"
      FROM "PlatformCommunicationPoll"
      WHERE "id" = ${poll.id} AND "tenantId" = ${input.tenantId}
      FOR UPDATE
    `;
    const state = locked[0];
    if (!state) throw new TeamCommunicationNotFoundError();
    if (state.createdEventId) {
      return { eventId: state.createdEventId, created: false as const };
    }

    const selectedOptionId = state.selectedOptionId ?? poll.selectedOptionId;
    const lockedSelected = poll.options.find((o) => o.id === selectedOptionId);
    if (!lockedSelected?.startAt) {
      throw new TeamCommunicationValidationError("selected option has no start time");
    }

    const eventId = await createOtherEventFromDatePoll(
      {
        ...eventPayload,
        startAt: lockedSelected.startAt,
        endAt: lockedSelected.endAt,
      },
      tx,
    );

    await tx.platformCommunicationPoll.update({
      where: { id: poll.id },
      data: { createdEventId: eventId },
    });

    return { eventId, created: true as const };
  });

  if (result.created) {
    await recordTeamPollAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: "DATE_POLL_EVENT_CREATED",
      communicationId: row.id,
      teamId: input.teamId,
      kind: row.kind,
      pollId: poll.id,
      eventId: result.eventId,
    });
  }

  return result;
}

function canViewerSeeResults(input: {
  resultsVisibility: string;
  lifecycle: PlatformCommunicationPollLifecycle;
  viewerHasResponded: boolean;
  viewerCanManage: boolean;
}): boolean {
  if (input.viewerCanManage) return true;
  switch (input.resultsVisibility) {
    case "SENDER_ONLY":
      return false;
    case "AFTER_RESPONSE":
      return input.viewerHasResponded;
    case "AFTER_CLOSE":
      return input.lifecycle === "CLOSED";
    default:
      return false;
  }
}

export async function buildPollTimelineDto(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  kind: PlatformCommunicationKind;
  viewerUserId: string;
  viewerCanSend: boolean;
}): Promise<TeamPollTimelineDto | null> {
  if (input.kind !== "POLL" && input.kind !== "DATE_POLL") return null;

  const poll = await prisma.platformCommunicationPoll.findFirst({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  if (!poll) return null;

  const now = new Date();
  const isOpen = pollIsEffectivelyOpen({
    lifecycle: poll.lifecycle,
    deadlineAt: poll.deadlineAt,
    now,
  });
  const isExpired =
    poll.deadlineAt !== null && poll.deadlineAt.getTime() < now.getTime() && poll.lifecycle === "OPEN";

  const snapshots = await resolveEligibleSnapshotsForActor({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
    actorUserId: input.viewerUserId,
  });
  const viewerSnapshotIds = snapshots.map((s) => s.id);

  const viewerResponses =
    viewerSnapshotIds.length > 0
      ? await prisma.platformCommunicationPollResponse.findMany({
          where: {
            tenantId: input.tenantId,
            pollId: poll.id,
            recipientSnapshotId: { in: viewerSnapshotIds },
          },
          select: { optionId: true },
        })
      : [];

  const viewerHasResponded = viewerResponses.length > 0;
  const canManage = input.viewerCanSend;
  const canViewResults = canViewerSeeResults({
    resultsVisibility: poll.resultsVisibility,
    lifecycle: poll.lifecycle,
    viewerHasResponded,
    viewerCanManage: canManage,
  });

  const results = canViewResults
    ? await getPollAggregateResults({ tenantId: input.tenantId, pollId: poll.id })
    : null;

  const optionsForViewer: TeamPollOptionDto[] =
    results?.options ??
    poll.options.map((opt) => ({
      id: opt.id,
      sortOrder: opt.sortOrder,
      label: opt.label,
      startAt: opt.startAt?.toISOString() ?? null,
      endAt: opt.endAt?.toISOString() ?? null,
      responseCount: 0,
    }));

  return {
    pollId: poll.id,
    kind: input.kind,
    mode: poll.mode,
    resultsVisibility: poll.resultsVisibility,
    lifecycle: poll.lifecycle,
    deadlineAt: poll.deadlineAt?.toISOString() ?? null,
    closedAt: poll.closedAt?.toISOString() ?? null,
    isExpired,
    isOpen,
    canRespond: isOpen && snapshots.length > 0,
    canViewResults,
    canManage,
    canSelectWinner: canManage && input.kind === "DATE_POLL" && poll.lifecycle === "CLOSED",
    canCreateEvent:
      canManage &&
      input.kind === "DATE_POLL" &&
      poll.selectedOptionId !== null &&
      poll.createdEventId === null,
    selectedOptionId: poll.selectedOptionId,
    createdEventId: poll.createdEventId,
    viewerSelectedOptionIds: [...new Set(viewerResponses.map((r) => r.optionId))],
    options: optionsForViewer,
    results,
  };
}

export async function loadPollTimelineBatch(input: {
  tenantId: string;
  teamId: string;
  items: { communicationId: string; kind: PlatformCommunicationKind }[];
  viewerUserId: string;
  viewerCanSend: boolean;
}): Promise<Map<string, TeamPollTimelineDto>> {
  const pollItems = input.items.filter((i) => i.kind === "POLL" || i.kind === "DATE_POLL");
  const map = new Map<string, TeamPollTimelineDto>();
  await Promise.all(
    pollItems.map(async (item) => {
      const dto = await buildPollTimelineDto({
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

export async function canInspectPollRecipientDetail(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  viewerUserId: string;
  viewerCanSend: boolean;
}): Promise<boolean> {
  if (input.viewerCanSend) return true;
  const row = await loadPublishedPollCommunication(input);
  const senderPersonId = row.senderPersonId;
  if (!senderPersonId) return false;
  const viewerPersonId = await resolvePersonIdForUser(input.viewerUserId, input.tenantId).catch(
    () => null,
  );
  return viewerPersonId !== null && viewerPersonId === senderPersonId;
}
