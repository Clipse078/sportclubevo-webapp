import MeetingWorkspace from "@/components/admin/meetings/workspace/MeetingWorkspace";
import type { ReactNode } from "react";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";

/**
 * Canonical meeting detail surface — always renders the DB-backed MeetingWorkspace.
 * The route loader must call notFound() before mounting this component when the
 * meeting is missing or the actor may not see it (404 masking).
 */

type VereinsleitungMeetingDetailProps = {
  dbMeeting: MeetingLiveData;
  subEntities: MeetingSubEntities;
  relatedTasksPanel?: ReactNode;
  meetingSlug: string;
  meetingTitle: string;
  fmtCfg: TenantFormatConfig;
  canManage: boolean;
  actorPersonId?: string | null;
  approvalWorkspaceData: MeetingApprovalWorkspaceData;
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
  canManage,
  actorPersonId = null,
  approvalWorkspaceData,
  canDelete = false,
  initialPendenzenOpenCount = 0,
  initialPendenzenOverdueCount = 0,
}: VereinsleitungMeetingDetailProps) {
  return (
    <MeetingWorkspace
      title={meetingTitle}
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