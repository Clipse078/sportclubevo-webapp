"use client";

import { useState, type ReactNode } from "react";
import {
  MeetingWorkspaceDirtyStateSync,
} from "@/components/admin/meetings/workspace/MeetingWorkspaceDirtyShell";
import MeetingWorkspaceHeader from "@/components/admin/meetings/workspace/MeetingWorkspaceHeader";
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
  initialSubEntities: MeetingSubEntities;
  relatedTasksPanel?: ReactNode;
};

export default function MeetingWorkspace({
  meeting,
  slug,
  canManage,
  initialSubEntities,
  relatedTasksPanel,
}: MeetingWorkspaceProps) {
  const [agendaItems, setAgendaItems] = useState(initialSubEntities.agendaItems);
  const [participants, setParticipants] = useState(initialSubEntities.participants);
  const [decisions, setDecisions] = useState(initialSubEntities.decisions);
  const [actions, setActions] = useState(initialSubEntities.actions);
  const [isDirty, setIsDirty] = useState(false);

  return (
    <>
      <MeetingWorkspaceDirtyStateSync isDirty={isDirty} />
      <div className="space-y-5" data-testid="meeting-workspace">
        <MeetingWorkspaceHeader
          meeting={meeting}
          slug={slug}
          canManage={canManage}
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
              canManage={canManage}
              items={agendaItems}
              onItemsChange={setAgendaItems}
              onDirtyChange={setIsDirty}
            />
            <MeetingDecisionsSection
              meetingId={meeting.id}
              canManage={canManage}
              items={decisions}
              onItemsChange={setDecisions}
            />
            <MeetingActionsSection
              meetingId={meeting.id}
              canManage={canManage}
              items={actions}
              onItemsChange={setActions}
            />
          </div>
          <div className="space-y-5">
            <MeetingParticipantsSection
              meetingId={meeting.id}
              canManage={canManage}
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
