/**
 * SCE-COMM-10 — Event-context communication and smart reminders.
 */

import type { PlatformCommunicationKind } from "@prisma/client";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import type { EventAudiencePreset } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { isEventAudiencePreset } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { ParticipationEventRef } from "@/lib/participation/types";
import {
  createTeamCommunicationDraft,
  publishTeamCommunication,
} from "@/lib/communication/team/team-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { resolveEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import {
  eventAudienceSpecFromPersonIds,
  listEventParticipationSubjectPersonIds,
  previewEventParticipationAudiences,
} from "@/lib/communication/event/event-participation-recipients";
import {
  defaultEventNoResponseReminderBody,
  eventPresetPreviewLabel,
} from "@/lib/communication/event/event-communication-presentation";
import { dispatchSmartReminderCommunication } from "@/lib/communication/smart-reminders/smart-reminder-dispatch";
import { recordEventCommunicationAudit } from "@/lib/communication/smart-reminders/smart-reminder-audit";
import { EVENT_AUDIENCE_PRESETS } from "@/lib/communication/platform/audience/zielgruppe-definition";

function assertEventKind(
  kind: string,
): Extract<PlatformCommunicationKind, "MESSAGE" | "ANNOUNCEMENT" | "ALERT"> {
  if (kind === "MESSAGE" || kind === "ANNOUNCEMENT" || kind === "ALERT") return kind;
  throw new TeamCommunicationValidationError("invalid communication kind for event context");
}

function resolvePreset(value: string | undefined): EventAudiencePreset {
  const preset = value?.trim() || "ALL_INVITEES";
  if (!isEventAudiencePreset(preset)) {
    throw new TeamCommunicationValidationError("invalid event audience preset");
  }
  return preset;
}

export async function previewEventCommunicationRecipients(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  event: ParticipationEventRef;
  preset?: string;
  senderUserId: string;
  viewerCanSend: boolean;
}): Promise<{
  preset: EventAudiencePreset;
  eligibleCount: number;
  effectiveCount: number;
  previewLabel: string;
  presets: Awaited<ReturnType<typeof previewEventParticipationAudiences>>;
}> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const preset = resolvePreset(input.preset);
  const anchor = await resolveEventParticipationAnchor({
    tenantId: input.tenantId,
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId,
    event: input.event,
  });

  const subjectPersonIds = await listEventParticipationSubjectPersonIds({ anchor, preset });
  const audienceSpec = eventAudienceSpecFromPersonIds(subjectPersonIds);
  const contextRef = eventCommunicationContext(anchor.contextEventId);

  const resolution = await resolveCommunicationRecipients({
    tenantId: input.tenantId,
    senderActor: { userId: input.senderUserId },
    audience: audienceSpec,
    context: contextRef,
    channel: "IN_APP",
    category: "TEAM_OPERATIONAL",
    mode: "PREVIEW",
  });

  const presets = await previewEventParticipationAudiences({
    anchor,
    presets: EVENT_AUDIENCE_PRESETS,
  });

  return {
    preset,
    eligibleCount: subjectPersonIds.length,
    effectiveCount: resolution.summary.effectiveCount,
    previewLabel: eventPresetPreviewLabel(preset, resolution.summary.effectiveCount),
    presets,
  };
}

export async function sendEventContextCommunication(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  event: ParticipationEventRef;
  senderUserId: string;
  viewerCanSend: boolean;
  kind: string;
  bodyText: string;
  subject?: string | null;
  audiencePreset?: string;
}): Promise<{ communicationId: string; recipientCount: number }> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const kind = assertEventKind(input.kind);
  const preset = resolvePreset(input.audiencePreset);
  const anchor = await resolveEventParticipationAnchor({
    tenantId: input.tenantId,
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId,
    event: input.event,
  });

  const subjectPersonIds = await listEventParticipationSubjectPersonIds({ anchor, preset });
  if (subjectPersonIds.length === 0) {
    throw new TeamCommunicationValidationError("no eligible recipients for event preset");
  }

  const audienceSpec = eventAudienceSpecFromPersonIds(subjectPersonIds);
  const contextRef = eventCommunicationContext(anchor.contextEventId);

  const draft = await createTeamCommunicationDraft({
    tenantId: input.tenantId,
    teamId: input.teamId,
    senderUserId: input.senderUserId,
    kind,
    bodyText: input.bodyText,
    subject: input.subject,
    contextRef,
    audienceSpec,
  });

  const published = await publishTeamCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    communicationId: draft.id,
    senderUserId: input.senderUserId,
    preservePreparedAudience: true,
  });

  await recordEventCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    communicationId: draft.id,
    teamId: input.teamId,
    kind,
    eventContextId: anchor.contextEventId,
  });

  return { communicationId: draft.id, recipientCount: published.recipientCount };
}

export async function sendEventNoResponseSmartReminder(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  event: ParticipationEventRef;
  senderUserId: string;
  viewerCanSend: boolean;
  bodyText?: string | null;
  kind?: string;
  executionIdentity?: string | null;
}): Promise<{ communicationId: string; recipientCount: number; duplicate?: boolean }> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const kind = assertEventKind(input.kind ?? "MESSAGE");
  const anchor = await resolveEventParticipationAnchor({
    tenantId: input.tenantId,
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId,
    event: input.event,
  });

  const subjectPersonIds = await listEventParticipationSubjectPersonIds({
    anchor,
    preset: "NOT_RESPONDED",
  });
  if (subjectPersonIds.length === 0) {
    throw new TeamCommunicationValidationError("no non-responders for event");
  }

  const bodyText =
    input.bodyText?.trim() || defaultEventNoResponseReminderBody(anchor.title);
  const result = await dispatchSmartReminderCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    senderUserId: input.senderUserId,
    kind,
    bodyText,
    contextRef: eventCommunicationContext(anchor.contextEventId),
    audienceSpec: eventAudienceSpecFromPersonIds(subjectPersonIds),
    orchestrationMeta: {
      reminderOrigin: "EVENT_NO_RESPONSE",
      eventAnchor: anchor.anchorRef,
      manualActionKey: input.executionIdentity ? null : `manual:${Date.now()}`,
    },
    executionIdentity: input.executionIdentity,
  });

  if (result.status === "duplicate_execution") {
    return { communicationId: result.communicationId, recipientCount: 0, duplicate: true };
  }
  return {
    communicationId: result.communicationId,
    recipientCount: result.recipientCount,
  };
}
