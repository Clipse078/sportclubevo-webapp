import MeetingWorkspace from "@/components/admin/meetings/workspace/MeetingWorkspace";
import type { ReactNode } from "react";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import type { MeetingAgendaTimerScope } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-types";
import type { MeetingTraktandumTaskCreateBaseProps } from "@/components/admin/meetings/workspace/MeetingTraktandumAufgabeCreate";
import type { SerializedAgendaLinkedTaskSummary } from "@/lib/meetings/agenda-linked-tasks-serialization";

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
  timerScope?: MeetingAgendaTimerScope | null;
  meetingTaskCreate?: MeetingTraktandumTaskCreateBaseProps | null;
  initialAgendaLinkedTaskCounts?: Record<string, number>;
  initialAgendaLinkedTasks?: SerializedAgendaLinkedTaskSummary[];
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
  timerScope = null,
  meetingTaskCreate = null,
  initialAgendaLinkedTaskCounts = {},
  initialAgendaLinkedTasks = [],
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
      timerScope={timerScope}
      meetingTaskCreate={meetingTaskCreate}
      initialAgendaLinkedTaskCounts={initialAgendaLinkedTaskCounts}
      initialAgendaLinkedTasks={initialAgendaLinkedTasks}
    />
  );
}