import {
  meetingApprovalAggregateStatusLabel,
  protocolReviewStageStatusLabel,
} from "@/lib/meetings/meeting-approval-presentation";
import { getMeetingLifecyclePresentation } from "@/lib/meetings/meeting-lifecycle";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";

export type MeetingWorkspaceStatusSummary = {
  lifecycleLabel: string;
  protocolLine: string;
  decisionsLine: string;
  attentionLine: string | null;
};

export function buildMeetingWorkspaceStatusSummary(input: {
  meeting: MeetingLiveData;
  participants: MeetingSubEntities["participants"];
  agendaItems: MeetingSubEntities["agendaItems"];
  decisions: MeetingSubEntities["decisions"];
  actions: MeetingSubEntities["actions"];
  hasInvitedParticipants: boolean;
}): MeetingWorkspaceStatusSummary {
  const lifecycle = getMeetingLifecyclePresentation({
    status: input.meeting.status ?? "PLANNED",
    meetingDate: input.meeting.meetingDate,
    participantCount: input.participants.length,
    agendaCount: input.agendaItems.length,
    decisionCount: input.decisions.length,
    actionCount: input.actions.length,
    hasInvitedParticipants: input.hasInvitedParticipants,
    conductedAt: input.meeting.conductedAt,
    reviewStage: input.meeting.reviewStage,
    protocolApprovalRequired: input.meeting.protocolApprovalRequired,
  });

  const protocolLine = input.meeting.protocolApprovalRequired
    ? `Protokoll: ${protocolReviewStageStatusLabel(
        input.meeting.reviewStage,
        true,
      )}`
    : "Protokoll: Freigabe nicht erforderlich";

  const pendingDecisions = input.decisions.filter(
    (d) => d.approvalRequired && d.approvalStatus === "PENDING",
  );
  const decisionsLine =
    pendingDecisions.length > 0
      ? `Beschlüsse: ${pendingDecisions.length} zur Prüfung`
      : input.decisions.length > 0
        ? `Beschlüsse: ${input.decisions.length} erfasst`
        : "Beschlüsse: Keine";

  let attentionLine: string | null = null;
  if (lifecycle.showPastDocumentationHint) {
    attentionLine = "Sitzung liegt in der Vergangenheit — Protokoll vervollständigen.";
  } else if (pendingDecisions.length > 0) {
    attentionLine = `${pendingDecisions.length} Beschluss/Beschlüsse warten auf Freigabe.`;
  }

  return {
    lifecycleLabel: lifecycle.lifecycleLabel,
    protocolLine,
    decisionsLine,
    attentionLine,
  };
}

export function countDecisionsAwaitingReview(
  decisions: MeetingSubEntities["decisions"],
): number {
  return decisions.filter((d) => d.approvalRequired && d.approvalStatus === "PENDING").length;
}

export function decisionStatusShortLabel(
  decision: MeetingSubEntities["decisions"][number],
): string {
  if (!decision.approvalRequired) return "Freigabe nicht erforderlich";
  return meetingApprovalAggregateStatusLabel(decision.approvalStatus);
}
