import VereinsleitungMeetingActionsCard from "@/components/admin/vereinsleitung/VereinsleitungMeetingActionsCard";
import VereinsleitungMeetingAgendaCard from "@/components/admin/vereinsleitung/VereinsleitungMeetingAgendaCard";
import VereinsleitungMeetingDecisionsCard from "@/components/admin/vereinsleitung/VereinsleitungMeetingDecisionsCard";
import VereinsleitungMeetingInfoCard from "@/components/admin/vereinsleitung/VereinsleitungMeetingInfoCard";
import VereinsleitungMeetingParticipantsCard from "@/components/admin/vereinsleitung/VereinsleitungMeetingParticipantsCard";
import MeetingWorkspace from "@/components/admin/meetings/workspace/MeetingWorkspace";
import type { ReactNode } from "react";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";

/**
 * TODO: Cross-Module Linking
 * 1. Add "Verknüpfte Ziele" panel showing Targets that reference this Meeting.
 * 2. Decision records → Target.nudgeJson as meeting outcome nudges.
 * 3. Action items with targetId → surface on linked Target detail.
 */

type VereinsleitungMeetingDetailProps = {
  dbMeeting?: MeetingLiveData | null;
  subEntities?: MeetingSubEntities | null;
  relatedTasksPanel?: ReactNode;
  meetingSlug?: string;
  meetingTitle?: string;
  fmtCfg?: TenantFormatConfig;
  canManage?: boolean;
  actorPersonId?: string | null;
  approvalWorkspaceData?: MeetingApprovalWorkspaceData | null;
  canDelete?: boolean;
  initialPendenzenOpenCount?: number;
  initialPendenzenOverdueCount?: number;
};

export default function VereinsleitungMeetingDetail({
  dbMeeting,
  subEntities,
  relatedTasksPanel,
  meetingSlug,
  meetingTitle,
  fmtCfg,
  canManage = false,
  actorPersonId = null,
  approvalWorkspaceData = null,
  canDelete = false,
  initialPendenzenOpenCount = 0,
  initialPendenzenOverdueCount = 0,
}: VereinsleitungMeetingDetailProps) {
  const isDbBacked = Boolean(dbMeeting);

  if (dbMeeting && subEntities && meetingSlug && approvalWorkspaceData && fmtCfg) {
    return (
      <MeetingWorkspace
        title={meetingTitle ?? dbMeeting.title}
        meeting={dbMeeting}
        slug={meetingSlug}
        canManage={canManage}
        actorPersonId={actorPersonId}
        approvalWorkspaceData={approvalWorkspaceData}
        initialSubEntities={subEntities}
        fmtCfg={fmtCfg}
        relatedTasksPanel={relatedTasksPanel}
        canDelete={canDelete}
        initialPendenzenOpenCount={initialPendenzenOpenCount}
        initialPendenzenOverdueCount={initialPendenzenOverdueCount}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.85fr)_360px]">
        <div className="space-y-5">
          <VereinsleitungMeetingAgendaCard isDbBacked={isDbBacked} agendaItems={subEntities?.agendaItems} />
          <VereinsleitungMeetingDecisionsCard isDbBacked={isDbBacked} decisions={subEntities?.decisions} />
          <VereinsleitungMeetingActionsCard isDbBacked={isDbBacked} actions={subEntities?.actions} />
        </div>
        <div className="space-y-5">
          <VereinsleitungMeetingInfoCard dbMeeting={dbMeeting} />
          <VereinsleitungMeetingParticipantsCard dbMeeting={dbMeeting} participants={subEntities?.participants} />
          {relatedTasksPanel}
        </div>
      </div>
    </div>
  );
}
