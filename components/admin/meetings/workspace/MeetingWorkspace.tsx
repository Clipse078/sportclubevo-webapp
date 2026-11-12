"use client";

import { useState, type ReactNode } from "react";
import {
  MeetingWorkspaceDirtyStateSync,
} from "@/components/admin/meetings/workspace/MeetingWorkspaceDirtyShell";
import MeetingWorkspaceHeader from "@/components/admin/meetings/workspace/MeetingWorkspaceHeader";
import MeetingWorkspaceLifecyclePanel from "@/components/admin/meetings/workspace/MeetingWorkspaceLifecyclePanel";
import MeetingProtocolApprovalSection from "@/components/admin/meetings/approval/MeetingProtocolApprovalSection";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import { canEditMeetingDocumentation } from "@/lib/meetings/meeting-workspace-lock";
import {
  MeetingActionsSection,
  MeetingAgendaSection,
  MeetingDecisionsSection,
  MeetingParticipantsSection,
} from "@/components/admin/meetings/workspace/MeetingWorkspaceSections";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";

type MeetingWorkspaceProps = {
  meeting: MeetingLiveData;
  slug: string;
  canManage: boolean;
  actorPersonId: string | null;
  approvalWorkspaceData: MeetingApprovalWorkspaceData;
  initialSubEntities: MeetingSubEntities;
  relatedTasksPanel?: ReactNode;
};

export default function MeetingWorkspace({
  meeting,
  slug,
  canManage,
  actorPersonId,
  approvalWorkspaceData,
  initialSubEntities,
  relatedTasksPanel,
}: MeetingWorkspaceProps) {
  const [agendaItems, setAgendaItems] = useState(initialSubEntities.agendaItems);
  const [participants, setParticipants] = useState(initialSubEntities.participants);
  const [decisions, setDecisions] = useState(initialSubEntities.decisions);
  const [actions, setActions] = useState(initialSubEntities.actions);
  const [isDirty, setIsDirty] = useState(false);
  const documentationEditable = canEditMeetingDocumentation({
    status: meeting.status,
    reviewStage: meeting.reviewStage,
    protocolApprovalRequired: meeting.protocolApprovalRequired,
  });
  const effectiveCanManage = canManage && documentationEditable;

  return (
    <>
      <MeetingWorkspaceDirtyStateSync isDirty={isDirty} />
      <div className="space-y-5" data-testid="meeting-workspace">
        <MeetingWorkspaceLifecyclePanel
          meeting={meeting}
          canManage={canManage}
          participantCount={participants.length}
          agendaCount={agendaItems.length}
        />
        <MeetingProtocolApprovalSection
          meeting={meeting}
          canManage={canManage}
          actorPersonId={actorPersonId}
          approvalData={approvalWorkspaceData}
        />
        <MeetingWorkspaceHeader
          meeting={meeting}
          slug={slug}
          canManage={effectiveCanManage}
          agendaCount={agendaItems.length}
          participantCount={participants.length}
          decisionCount={decisions.length}
          actionCount={actions.length}
          hasInvitedParticipants={participants.some((p) => p.status === "INVITED")}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.85fr)_360px]">
          <div className="space-y-5">
            <MeetingAgendaSection
              meetingId={meeting.id}
              meetingPlannedDurationMin={meeting.plannedDurationMin}
              canManage={effectiveCanManage}
              items={agendaItems}
              decisions={decisions}
              onItemsChange={setAgendaItems}
              onDecisionsChange={setDecisions}
              onDirtyChange={setIsDirty}
            />
            <MeetingDecisionsSection
              meetingId={meeting.id}
              meetingSlug={slug}
              meetingStatus={meeting.status}
              canManage={canManage}
              documentationEditable={effectiveCanManage}
              actorPersonId={actorPersonId}
              approvalWorkspaceData={approvalWorkspaceData}
              agendaItems={agendaItems}
              items={decisions}
              onItemsChange={setDecisions}
            />
            <MeetingActionsSection
              meetingId={meeting.id}
              canManage={effectiveCanManage}
              items={actions}
              onItemsChange={setActions}
            />
          </div>
          <div className="space-y-5">
            <MeetingParticipantsSection
              meetingId={meeting.id}
              canManage={effectiveCanManage}
              items={participants}
              onItemsChange={setParticipants}
              onDirtyChange={setIsDirty}
            />
            {relatedTasksPanel}
          </div>
        </div>
      </div>
    </>
  );
}
