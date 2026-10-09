/**
 * SCE-COLLAB-01A — prepared team communication drafts from activity change context.
 */

import { prisma } from "@/lib/db/prisma";
import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import { defaultTeamOperationalAudience } from "@/lib/communication/platform/seams/team-communication-seam";
import {
  createTeamCommunicationDraft,
  publishTeamCommunication,
} from "@/lib/communication/team/team-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import type { ActivityChangeSet } from "@/lib/collaboration/activity-change/types";
import {
  buildActivityChangeAnnouncementBody,
  DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  MATCH_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  TOURNAMENT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  CLUB_EVENT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
} from "@/lib/collaboration/activity-change/presentation";
import { loadMatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import { resolveMatchAudienceContext } from "@/lib/collaboration/match/resolve-match-audience";
import { loadTournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import { resolveTournamentAudienceContext } from "@/lib/collaboration/tournament/resolve-tournament-audience";
import { buildOperationalAudienceForTeamIds } from "@/lib/collaboration/shared/operational-audience";
import { resolveActivityChangeDispatchPreview } from "@/lib/collaboration/shared/resolve-activity-change-dispatch-preview";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import {
  buildActivityChangeOrchestrationMeta,
  parseActivityChangeOrchestrationMeta,
} from "@/lib/collaboration/activity-change/orchestration-meta";
import { loadTrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import {
  buildTrainingActivityChangeSet,
  diffTrainingActivitySnapshots,
} from "@/lib/collaboration/training/training-activity-change";
import { resolveContextualCommunicationSendAuthorization } from "@/lib/collaboration/contextual-communication-authorization";
import { buildActivityChangeFingerprint } from "@/lib/collaboration/activity-change/fingerprint";
import { filterCommunicationWorthyChanges } from "@/lib/collaboration/activity-change/policy";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { loadClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import { resolveClubEventAudienceContext } from "@/lib/collaboration/club-event/resolve-club-event-audience";
import {
  resolveClubEventCommunicationScope,
  type ClubEventCommunicationScope,
} from "@/lib/collaboration/club-event/resolve-club-event-audience-preview";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import {
  createClubCommunicationDraft,
  publishClubCommunication,
} from "@/lib/communication/club/club-communication-service";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";

export type PrepareContextualCommunicationResult = {
  draftId: string;
  teamId: string | null;
  communicationScope?: ClubEventCommunicationScope;
  redirectPath: string;
  reusedExistingDraft: boolean;
  subject: string;
  bodyText: string;
  audienceLabel: string;
  recipientCount: number;
  canDispatch: boolean;
};

async function attachPrepareDispatchPreview(input: {
  tenantId: string;
  senderUserId: string;
  eventId: string;
  audienceSpec: CommunicationAudienceSpec;
  audienceLabel: string;
  base: Omit<PrepareContextualCommunicationResult, "audienceLabel" | "recipientCount" | "canDispatch">;
}): Promise<PrepareContextualCommunicationResult> {
  const preview = await resolveActivityChangeDispatchPreview({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    eventId: input.eventId,
    audience: input.audienceSpec,
  });
  return {
    ...input.base,
    audienceLabel: input.audienceLabel,
    recipientCount: preview.recipientCount,
    canDispatch: preview.canDispatch,
  };
}

function buildActivityChangeSubject(title: string): string {
  return `Änderung: ${title.trim()}`;
}

function buildTrainingChangeBody(input: {
  changeSet: ActivityChangeSet;
  scheduleLine: string | null;
}): string {
  return buildActivityChangeAnnouncementBody({
    introLine: "Das Training wurde angepasst.",
    entries: input.changeSet.entries,
    scheduleLine: input.scheduleLine,
    labels: DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  });
}

async function findExistingActivityChangeDraft(input: {
  tenantId: string;
  teamId: string;
  senderUserId: string;
  fingerprint: string;
  activityId: string;
}): Promise<{ id: string } | null> {
  const rows = await prisma.platformCommunication.findMany({
    where: {
      tenantId: input.tenantId,
      status: "DRAFT",
      createdByUserId: input.senderUserId,
      conversation: { teamId: input.teamId },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, orchestrationMetaJson: true },
  });

  for (const row of rows) {
    const meta = parseActivityChangeOrchestrationMeta(row.orchestrationMetaJson);
    if (!meta) continue;
    if (meta.activityId !== input.activityId) continue;
    if (meta.changeFingerprint !== input.fingerprint) continue;
    return { id: row.id };
  }
  return null;
}

async function findExistingClubActivityChangeDraft(input: {
  tenantId: string;
  senderUserId: string;
  fingerprint: string;
  activityId: string;
}): Promise<{ id: string } | null> {
  const rows = await prisma.platformCommunication.findMany({
    where: {
      tenantId: input.tenantId,
      status: "DRAFT",
      createdByUserId: input.senderUserId,
      conversation: { contextKind: "ORGANISATION", teamId: null },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, orchestrationMetaJson: true },
  });

  for (const row of rows) {
    const meta = parseActivityChangeOrchestrationMeta(row.orchestrationMetaJson);
    if (!meta) continue;
    if (meta.activityDomain !== "CLUB_EVENT") continue;
    if (meta.activityId !== input.activityId) continue;
    if (meta.changeFingerprint !== input.fingerprint) continue;
    return { id: row.id };
  }
  return null;
}

export function validateChangeSetAgainstCurrentSnapshot(
  snapshot: TrainingActivitySnapshot,
  changeSet: ActivityChangeSet,
): void {
  if (changeSet.domain !== "TRAINING" || changeSet.activityId !== snapshot.sessionId) {
    throw new TeamCommunicationValidationError("activity change context mismatch");
  }
  const expectedFingerprint = buildActivityChangeFingerprint({
    domain: changeSet.domain,
    activityId: changeSet.activityId,
    entries: changeSet.entries,
  });
  if (expectedFingerprint !== changeSet.fingerprint) {
    throw new TeamCommunicationValidationError("invalid activity change fingerprint");
  }

  for (const entry of changeSet.entries) {
    switch (entry.field) {
      case "DATE":
        if (snapshot.dateKey !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (date)");
        }
        break;
      case "START_TIME":
        if (snapshot.startTime !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (start time)");
        }
        break;
      case "END_TIME":
        if (snapshot.endTime !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (end time)");
        }
        break;
      case "VENUE":
        if (snapshot.playableVenueLabel !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (venue)");
        }
        break;
      case "RESOURCE":
        if (snapshot.dressingRoomLabel !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (resource)");
        }
        break;
      case "STATUS":
        if (snapshot.status !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (status)");
        }
        break;
      default:
        break;
    }
  }
}

export async function prepareTrainingActivityChangeCommunicationDraft(input: {
  tenantId: string;
  tenantKey: string;
  senderUserId: string;
  sessionId: string;
  changeSet: ActivityChangeSet;
}): Promise<PrepareContextualCommunicationResult> {
  const snapshot = await loadTrainingActivitySnapshot({
    tenantId: input.tenantId,
    sessionId: input.sessionId,
  });
  if (!snapshot) {
    throw new TeamCommunicationNotFoundError("training session not found");
  }

  const { canCommunicate } = await resolveContextualCommunicationSendAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.senderUserId,
    teamId: snapshot.teamId,
  });
  if (!canCommunicate) {
    throw new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_SEND_DENIED");
  }

  validateChangeSetAgainstCurrentSnapshot(snapshot, input.changeSet);
  const changeSet = input.changeSet;

  const existing = await findExistingActivityChangeDraft({
    tenantId: input.tenantId,
    teamId: snapshot.teamId,
    senderUserId: input.senderUserId,
    fingerprint: changeSet.fingerprint,
    activityId: snapshot.sessionId,
  });

  const subject = buildActivityChangeSubject(snapshot.title);
  const bodyText = buildTrainingChangeBody({
    changeSet,
    scheduleLine: snapshot.scheduleLine,
  });

  const audienceSpec = defaultTeamOperationalAudience(snapshot.teamId);
  const audienceLabel = snapshot.teamName?.trim() || "Team";

  if (existing) {
    return attachPrepareDispatchPreview({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      eventId: snapshot.sessionId,
      audienceSpec,
      audienceLabel,
      base: {
        draftId: existing.id,
        teamId: snapshot.teamId,
        redirectPath: `/dashboard/teams/${snapshot.teamId}/kommunikation?communicationId=${existing.id}`,
        reusedExistingDraft: true,
        subject,
        bodyText,
      },
    });
  }

  const orchestrationMeta = buildActivityChangeOrchestrationMeta({
    activityDomain: "TRAINING",
    activityId: snapshot.sessionId,
    changeFingerprint: changeSet.fingerprint,
    eventAnchor: {
      eventKind: "TRAINING",
      trainingSessionId: snapshot.sessionId,
      teamSeasonId: snapshot.teamSeasonId,
      contextEventId: snapshot.sessionId,
    },
  });

  const draft = await createTeamCommunicationDraft({
    tenantId: input.tenantId,
    teamId: snapshot.teamId,
    senderUserId: input.senderUserId,
    kind: "ANNOUNCEMENT",
    subject,
    bodyText,
    audienceSpec,
    contextRef: eventCommunicationContext(snapshot.sessionId),
    orchestrationMetaJson: orchestrationMeta as unknown as import("@prisma/client").Prisma.InputJsonValue,
  });

  return attachPrepareDispatchPreview({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    eventId: snapshot.sessionId,
    audienceSpec,
    audienceLabel,
    base: {
      draftId: draft.id,
      teamId: snapshot.teamId,
      redirectPath: `/dashboard/teams/${snapshot.teamId}/kommunikation?communicationId=${draft.id}`,
      reusedExistingDraft: false,
      subject,
      bodyText,
    },
  });
}

/** Validates a before/after pair supplied by mutation handlers (authoritative). */
export function buildValidatedTrainingChangeSet(input: {
  before: TrainingActivitySnapshot;
  after: TrainingActivitySnapshot;
}): ActivityChangeSet | null {
  return buildTrainingActivityChangeSet(input.before, input.after);
}

export function recomputeTrainingChangeEntries(
  before: TrainingActivitySnapshot,
  after: TrainingActivitySnapshot,
): ActivityChangeSet["entries"] {
  return filterCommunicationWorthyChanges(diffTrainingActivitySnapshots(before, after));
}

export async function publishPreparedTrainingActivityChangeCommunication(input: {
  tenantId: string;
  tenantKey: string;
  senderUserId: string;
  teamId: string;
  draftId: string;
  subject?: string | null;
  bodyText?: string | null;
}): Promise<{ communicationId: string; recipientCount: number }> {
  const { canCommunicate } = await resolveContextualCommunicationSendAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.senderUserId,
    teamId: input.teamId,
  });
  if (!canCommunicate) {
    throw new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_SEND_DENIED");
  }

  const row = await prisma.platformCommunication.findFirst({
    where: { id: input.draftId, tenantId: input.tenantId, status: "DRAFT" },
    include: { conversation: { select: { teamId: true } } },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.conversation.teamId !== input.teamId) {
    throw new TeamCommunicationNotFoundError();
  }

  const meta = parseActivityChangeOrchestrationMeta(row.orchestrationMetaJson);
  if (!meta || meta.collaborationOrigin !== "ACTIVITY_CHANGE") {
    throw new TeamCommunicationValidationError("not an activity-change draft");
  }

  const nextSubject = input.subject?.trim() || row.subject;
  const nextBody = input.bodyText?.trim() || row.bodyText;
  if (!nextBody?.trim()) {
    throw new TeamCommunicationValidationError("body is required");
  }

  await prisma.platformCommunication.update({
    where: { id: row.id },
    data: {
      subject: nextSubject,
      bodyText: nextBody,
    },
  });

  const published = await publishTeamCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    communicationId: row.id,
    senderUserId: input.senderUserId,
    preservePreparedAudience: true,
  });

  return { communicationId: published.id, recipientCount: published.recipientCount };
}

function assertChangeSetFingerprint(changeSet: ActivityChangeSet): void {
  const expectedFingerprint = buildActivityChangeFingerprint({
    domain: changeSet.domain,
    activityId: changeSet.activityId,
    entries: changeSet.entries,
  });
  if (expectedFingerprint !== changeSet.fingerprint) {
    throw new TeamCommunicationValidationError("invalid activity change fingerprint");
  }
}

function validateMatchChangeSetAgainstSnapshot(
  snapshot: MatchActivitySnapshot,
  changeSet: ActivityChangeSet,
): void {
  if (changeSet.domain !== "MATCH" || changeSet.activityId !== snapshot.matchId) {
    throw new TeamCommunicationValidationError("activity change context mismatch");
  }
  assertChangeSetFingerprint(changeSet);
  for (const entry of changeSet.entries) {
    switch (entry.field) {
      case "DATE":
        if (snapshot.dateKey !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (date)");
        }
        break;
      case "START_TIME":
        if (snapshot.startTime !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (start time)");
        }
        break;
      case "END_TIME":
        if (snapshot.endTime !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (end time)");
        }
        break;
      case "VENUE":
        if (snapshot.playableVenueLabel !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (venue)");
        }
        break;
      case "RESOURCE":
        if (snapshot.dressingRoomLabel !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (resource)");
        }
        break;
      case "STATUS":
        if (snapshot.status !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (status)");
        }
        break;
      default:
        break;
    }
  }
}

function validateTournamentChangeSetAgainstSnapshot(
  snapshot: TournamentActivitySnapshot,
  changeSet: ActivityChangeSet,
): void {
  if (changeSet.domain !== "TOURNAMENT" || changeSet.activityId !== snapshot.tournamentId) {
    throw new TeamCommunicationValidationError("activity change context mismatch");
  }
  assertChangeSetFingerprint(changeSet);
  for (const entry of changeSet.entries) {
    switch (entry.field) {
      case "DATE":
        if (snapshot.dateKey !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (date)");
        }
        break;
      case "START_TIME":
        if (snapshot.startTime !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (start time)");
        }
        break;
      case "END_TIME":
        if (snapshot.endTime !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (end time)");
        }
        break;
      case "VENUE":
        if (snapshot.playableVenueLabel !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (venue)");
        }
        break;
      case "STATUS":
        if (snapshot.status !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (status)");
        }
        break;
      default:
        break;
    }
  }
}

async function publishPreparedActivityChangeCommunication(input: {
  tenantId: string;
  tenantKey: string;
  senderUserId: string;
  teamId: string;
  draftId: string;
  subject?: string | null;
  bodyText?: string | null;
}): Promise<{ communicationId: string; recipientCount: number }> {
  const { canCommunicate } = await resolveContextualCommunicationSendAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.senderUserId,
    teamId: input.teamId,
  });
  if (!canCommunicate) {
    throw new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_SEND_DENIED");
  }

  const row = await prisma.platformCommunication.findFirst({
    where: { id: input.draftId, tenantId: input.tenantId, status: "DRAFT" },
    include: { conversation: { select: { teamId: true } } },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.conversation.teamId !== input.teamId) {
    throw new TeamCommunicationNotFoundError();
  }

  const meta = parseActivityChangeOrchestrationMeta(row.orchestrationMetaJson);
  if (!meta || meta.collaborationOrigin !== "ACTIVITY_CHANGE") {
    throw new TeamCommunicationValidationError("not an activity-change draft");
  }

  const nextSubject = input.subject?.trim() || row.subject;
  const nextBody = input.bodyText?.trim() || row.bodyText;
  if (!nextBody?.trim()) {
    throw new TeamCommunicationValidationError("body is required");
  }

  await prisma.platformCommunication.update({
    where: { id: row.id },
    data: { subject: nextSubject, bodyText: nextBody },
  });

  const published = await publishTeamCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    communicationId: row.id,
    senderUserId: input.senderUserId,
    preservePreparedAudience: true,
  });

  return { communicationId: published.id, recipientCount: published.recipientCount };
}

export async function prepareMatchActivityChangeCommunicationDraft(input: {
  tenantId: string;
  tenantKey: string;
  senderUserId: string;
  matchId: string;
  changeSet: ActivityChangeSet;
}): Promise<PrepareContextualCommunicationResult> {
  const snapshot = await loadMatchActivitySnapshot({
    tenantId: input.tenantId,
    matchId: input.matchId,
  });
  if (!snapshot) {
    throw new TeamCommunicationNotFoundError("match not found");
  }

  const audienceContext = await resolveMatchAudienceContext({
    tenantId: input.tenantId,
    snapshot,
  });
  if (!audienceContext) {
    throw new TeamCommunicationValidationError("match has no SCE team audience");
  }

  const { canCommunicate } = await resolveContextualCommunicationSendAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.senderUserId,
    teamId: audienceContext.primaryTeamId,
  });
  if (!canCommunicate) {
    throw new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_SEND_DENIED");
  }

  validateMatchChangeSetAgainstSnapshot(snapshot, input.changeSet);
  const changeSet = input.changeSet;
  const audienceSpec = buildOperationalAudienceForTeamIds(audienceContext.teamIds);
  const audienceLabel =
    audienceContext.teamNamesLabel?.trim() || audienceContext.teamName?.trim() || "Team";

  const existing = await findExistingActivityChangeDraft({
    tenantId: input.tenantId,
    teamId: audienceContext.primaryTeamId,
    senderUserId: input.senderUserId,
    fingerprint: changeSet.fingerprint,
    activityId: snapshot.matchId,
  });

  const subject = buildActivityChangeSubject(snapshot.title);
  const bodyText = buildActivityChangeAnnouncementBody({
    introLine: "Das Spiel wurde angepasst.",
    entries: changeSet.entries,
    scheduleLine: snapshot.scheduleLine,
    labels: MATCH_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  });

  if (existing) {
    return attachPrepareDispatchPreview({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      eventId: snapshot.matchId,
      audienceSpec,
      audienceLabel,
      base: {
        draftId: existing.id,
        teamId: audienceContext.primaryTeamId,
        redirectPath: `/dashboard/teams/${audienceContext.primaryTeamId}/kommunikation?communicationId=${existing.id}`,
        reusedExistingDraft: true,
        subject,
        bodyText,
      },
    });
  }

  const orchestrationMeta = buildActivityChangeOrchestrationMeta({
    activityDomain: "MATCH",
    activityId: snapshot.matchId,
    changeFingerprint: changeSet.fingerprint,
    eventAnchor: {
      eventKind: "MATCH",
      eventId: snapshot.matchId,
      teamSeasonId: snapshot.teamSeasonId,
      contextEventId: snapshot.matchId,
    },
  });

  const draft = await createTeamCommunicationDraft({
    tenantId: input.tenantId,
    teamId: audienceContext.primaryTeamId,
    senderUserId: input.senderUserId,
    kind: "ANNOUNCEMENT",
    subject,
    bodyText,
    audienceSpec,
    contextRef: eventCommunicationContext(snapshot.matchId),
    orchestrationMetaJson: orchestrationMeta as unknown as import("@prisma/client").Prisma.InputJsonValue,
  });

  return attachPrepareDispatchPreview({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    eventId: snapshot.matchId,
    audienceSpec,
    audienceLabel,
    base: {
      draftId: draft.id,
      teamId: audienceContext.primaryTeamId,
      redirectPath: `/dashboard/teams/${audienceContext.primaryTeamId}/kommunikation?communicationId=${draft.id}`,
      reusedExistingDraft: false,
      subject,
      bodyText,
    },
  });
}

export async function prepareTournamentActivityChangeCommunicationDraft(input: {
  tenantId: string;
  tenantKey: string;
  senderUserId: string;
  tournamentId: string;
  changeSet: ActivityChangeSet;
}): Promise<PrepareContextualCommunicationResult> {
  const snapshot = await loadTournamentActivitySnapshot({
    tenantId: input.tenantId,
    tournamentId: input.tournamentId,
  });
  if (!snapshot) {
    throw new TeamCommunicationNotFoundError("tournament not found");
  }

  const audienceContext = await resolveTournamentAudienceContext({
    tenantId: input.tenantId,
    tournamentId: input.tournamentId,
    eventTeamId: snapshot.teamId,
  });
  if (!audienceContext) {
    throw new TeamCommunicationValidationError("tournament has no SCE team audience");
  }

  const { canCommunicate } = await resolveContextualCommunicationSendAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.senderUserId,
    teamId: audienceContext.primaryTeamId,
  });
  if (!canCommunicate) {
    throw new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_SEND_DENIED");
  }

  validateTournamentChangeSetAgainstSnapshot(snapshot, input.changeSet);
  const changeSet = input.changeSet;
  const audienceSpec = buildOperationalAudienceForTeamIds(audienceContext.teamIds);
  const audienceLabel =
    audienceContext.teamNamesLabel?.trim() || audienceContext.teamName?.trim() || "Team";

  const existing = await findExistingActivityChangeDraft({
    tenantId: input.tenantId,
    teamId: audienceContext.primaryTeamId,
    senderUserId: input.senderUserId,
    fingerprint: changeSet.fingerprint,
    activityId: snapshot.tournamentId,
  });

  const subject = buildActivityChangeSubject(snapshot.title);
  const bodyText = buildActivityChangeAnnouncementBody({
    introLine: "Das Turnier wurde angepasst.",
    entries: changeSet.entries,
    scheduleLine: snapshot.scheduleLine,
    labels: TOURNAMENT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  });

  if (existing) {
    return attachPrepareDispatchPreview({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      eventId: snapshot.tournamentId,
      audienceSpec,
      audienceLabel,
      base: {
        draftId: existing.id,
        teamId: audienceContext.primaryTeamId,
        redirectPath: `/dashboard/teams/${audienceContext.primaryTeamId}/kommunikation?communicationId=${existing.id}`,
        reusedExistingDraft: true,
        subject,
        bodyText,
      },
    });
  }

  const orchestrationMeta = buildActivityChangeOrchestrationMeta({
    activityDomain: "TOURNAMENT",
    activityId: snapshot.tournamentId,
    changeFingerprint: changeSet.fingerprint,
    eventAnchor: {
      eventKind: "TOURNAMENT",
      eventId: snapshot.tournamentId,
      teamSeasonId: snapshot.teamSeasonId,
      contextEventId: snapshot.tournamentId,
    },
  });

  const draft = await createTeamCommunicationDraft({
    tenantId: input.tenantId,
    teamId: audienceContext.primaryTeamId,
    senderUserId: input.senderUserId,
    kind: "ANNOUNCEMENT",
    subject,
    bodyText,
    audienceSpec,
    contextRef: eventCommunicationContext(snapshot.tournamentId),
    orchestrationMetaJson: orchestrationMeta as unknown as import("@prisma/client").Prisma.InputJsonValue,
  });

  return attachPrepareDispatchPreview({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    eventId: snapshot.tournamentId,
    audienceSpec,
    audienceLabel,
    base: {
      draftId: draft.id,
      teamId: audienceContext.primaryTeamId,
      redirectPath: `/dashboard/teams/${audienceContext.primaryTeamId}/kommunikation?communicationId=${draft.id}`,
      reusedExistingDraft: false,
      subject,
      bodyText,
    },
  });
}

export async function publishPreparedMatchActivityChangeCommunication(input: {
  tenantId: string;
  tenantKey: string;
  senderUserId: string;
  teamId: string;
  draftId: string;
  subject?: string | null;
  bodyText?: string | null;
}): Promise<{ communicationId: string; recipientCount: number }> {
  return publishPreparedActivityChangeCommunication(input);
}

export async function publishPreparedTournamentActivityChangeCommunication(input: {
  tenantId: string;
  tenantKey: string;
  senderUserId: string;
  teamId: string;
  draftId: string;
  subject?: string | null;
  bodyText?: string | null;
}): Promise<{ communicationId: string; recipientCount: number }> {
  return publishPreparedActivityChangeCommunication(input);
}

function validateClubEventChangeSetAgainstSnapshot(
  snapshot: ClubEventActivitySnapshot,
  changeSet: ActivityChangeSet,
): void {
  if (changeSet.domain !== "CLUB_EVENT" || changeSet.activityId !== snapshot.eventId) {
    throw new TeamCommunicationValidationError("activity change context mismatch");
  }
  assertChangeSetFingerprint(changeSet);
  for (const entry of changeSet.entries) {
    switch (entry.field) {
      case "DATE":
        if (snapshot.dateKey !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (date)");
        }
        break;
      case "START_TIME":
        if (snapshot.startTime !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (start time)");
        }
        break;
      case "END_TIME":
        if (snapshot.endTime !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (end time)");
        }
        break;
      case "VENUE":
        if (snapshot.locationLabel !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (venue)");
        }
        break;
      case "RESOURCE":
        if (snapshot.resourceLabel !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (resource)");
        }
        break;
      case "STATUS":
        if (snapshot.status !== entry.newValue) {
          throw new TeamCommunicationValidationError("activity change is stale (status)");
        }
        break;
      default:
        break;
    }
  }
}

export async function prepareClubEventActivityChangeCommunicationDraft(input: {
  tenantId: string;
  tenantKey: string;
  senderUserId: string;
  eventId: string;
  changeSet: ActivityChangeSet;
}): Promise<PrepareContextualCommunicationResult> {
  const snapshot = await loadClubEventActivitySnapshot({
    tenantId: input.tenantId,
    eventId: input.eventId,
  });
  if (!snapshot) {
    throw new TeamCommunicationNotFoundError("club event not found");
  }

  const audienceContext = await resolveClubEventAudienceContext({
    tenantId: input.tenantId,
    snapshot,
  });
  if (!audienceContext) {
    throw new TeamCommunicationValidationError("club event has no participation audience");
  }

  const { scope, canCommunicate } = await resolveClubEventCommunicationScope({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.senderUserId,
    audienceContext,
  });
  if (!canCommunicate) {
    throw new TeamCommunicationForbiddenError("CLUB_EVENT_COMMUNICATION_SEND_DENIED");
  }

  validateClubEventChangeSetAgainstSnapshot(snapshot, input.changeSet);
  const changeSet = input.changeSet;
  const audienceSpec = audienceContext.audienceSpec;
  const audienceLabel = audienceContext.audienceLabel;

  const subject = buildActivityChangeSubject(snapshot.title);
  const bodyText = buildActivityChangeAnnouncementBody({
    introLine: "Die Veranstaltung wurde angepasst.",
    entries: changeSet.entries,
    scheduleLine: snapshot.scheduleLine,
    labels: CLUB_EVENT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  });

  const orchestrationMeta = buildActivityChangeOrchestrationMeta({
    activityDomain: "CLUB_EVENT",
    activityId: snapshot.eventId,
    changeFingerprint: changeSet.fingerprint,
    eventAnchor: {
      eventKind: "CLUB_EVENT",
      eventId: snapshot.eventId,
      teamSeasonId: snapshot.teamSeasonId,
      contextEventId: snapshot.eventId,
    },
  });

  if (scope === "TEAM" && audienceContext.primaryTeamId) {
    const teamId = audienceContext.primaryTeamId;
    const existing = await findExistingActivityChangeDraft({
      tenantId: input.tenantId,
      teamId,
      senderUserId: input.senderUserId,
      fingerprint: changeSet.fingerprint,
      activityId: snapshot.eventId,
    });

    if (existing) {
      return attachPrepareDispatchPreview({
        tenantId: input.tenantId,
        senderUserId: input.senderUserId,
        eventId: snapshot.eventId,
        audienceSpec,
        audienceLabel,
        base: {
          draftId: existing.id,
          teamId,
          communicationScope: "TEAM",
          redirectPath: `/dashboard/teams/${teamId}/kommunikation?communicationId=${existing.id}`,
          reusedExistingDraft: true,
          subject,
          bodyText,
        },
      });
    }

    const draft = await createTeamCommunicationDraft({
      tenantId: input.tenantId,
      teamId,
      senderUserId: input.senderUserId,
      kind: "ANNOUNCEMENT",
      subject,
      bodyText,
      audienceSpec,
      contextRef: eventCommunicationContext(snapshot.eventId),
      orchestrationMetaJson: orchestrationMeta as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return attachPrepareDispatchPreview({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      eventId: snapshot.eventId,
      audienceSpec,
      audienceLabel,
      base: {
        draftId: draft.id,
        teamId,
        communicationScope: "TEAM",
        redirectPath: `/dashboard/teams/${teamId}/kommunikation?communicationId=${draft.id}`,
        reusedExistingDraft: false,
        subject,
        bodyText,
      },
    });
  }

  const existingClub = await findExistingClubActivityChangeDraft({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    fingerprint: changeSet.fingerprint,
    activityId: snapshot.eventId,
  });

  if (existingClub) {
    return attachPrepareDispatchPreview({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      eventId: snapshot.eventId,
      audienceSpec,
      audienceLabel,
      base: {
        draftId: existingClub.id,
        teamId: null,
        communicationScope: "CLUB",
        redirectPath: `/dashboard/kommunikation/club?communicationId=${existingClub.id}`,
        reusedExistingDraft: true,
        subject,
        bodyText,
      },
    });
  }

  const draft = await createClubCommunicationDraft({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    kind: "ANNOUNCEMENT",
    subject,
    bodyText,
    audienceSpec,
    contextRef: eventCommunicationContext(snapshot.eventId),
    orchestrationMetaJson: orchestrationMeta as unknown as import("@prisma/client").Prisma.InputJsonValue,
  });

  return attachPrepareDispatchPreview({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    eventId: snapshot.eventId,
    audienceSpec,
    audienceLabel,
    base: {
      draftId: draft.id,
      teamId: null,
      communicationScope: "CLUB",
      redirectPath: `/dashboard/kommunikation/club?communicationId=${draft.id}`,
      reusedExistingDraft: false,
      subject,
      bodyText,
    },
  });
}

export async function publishPreparedClubEventActivityChangeCommunication(input: {
  tenantId: string;
  tenantKey: string;
  senderUserId: string;
  draftId: string;
  communicationScope: ClubEventCommunicationScope;
  teamId?: string | null;
  subject?: string | null;
  bodyText?: string | null;
}): Promise<{ communicationId: string; recipientCount: number }> {
  if (input.communicationScope === "TEAM") {
    const teamId = input.teamId?.trim();
    if (!teamId) {
      throw new TeamCommunicationValidationError("teamId is required for team-scoped club event communication");
    }
    return publishPreparedActivityChangeCommunication({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey,
      senderUserId: input.senderUserId,
      teamId,
      draftId: input.draftId,
      subject: input.subject,
      bodyText: input.bodyText,
    });
  }

  const clubAuth = await resolveClubCommunicationAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.senderUserId,
  });
  if (!clubAuth.canSend) {
    throw new TeamCommunicationForbiddenError("CLUB_COMMUNICATION_SEND_DENIED");
  }

  const row = await prisma.platformCommunication.findFirst({
    where: { id: input.draftId, tenantId: input.tenantId, status: "DRAFT" },
    include: { conversation: { select: { contextKind: true, teamId: true } } },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.conversation.contextKind !== "ORGANISATION" || row.conversation.teamId !== null) {
    throw new TeamCommunicationNotFoundError();
  }

  const meta = parseActivityChangeOrchestrationMeta(row.orchestrationMetaJson);
  if (!meta || meta.collaborationOrigin !== "ACTIVITY_CHANGE" || meta.activityDomain !== "CLUB_EVENT") {
    throw new TeamCommunicationValidationError("not a club event activity-change draft");
  }

  const nextSubject = input.subject?.trim() || row.subject;
  const nextBody = input.bodyText?.trim() || row.bodyText;
  if (!nextBody?.trim()) {
    throw new TeamCommunicationValidationError("body is required");
  }

  await prisma.platformCommunication.update({
    where: { id: row.id },
    data: { subject: nextSubject, bodyText: nextBody },
  });

  const published = await publishClubCommunication({
    tenantId: input.tenantId,
    communicationId: row.id,
    senderUserId: input.senderUserId,
  });

  return { communicationId: published.id, recipientCount: published.recipientCount };
}
