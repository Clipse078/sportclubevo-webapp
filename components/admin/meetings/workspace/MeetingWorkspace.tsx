"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import {
  MeetingWorkspaceDirtyStateSync,
} from "@/components/admin/meetings/workspace/MeetingWorkspaceDirtyShell";
import MeetingWorkspaceHeader from "@/components/admin/meetings/workspace/MeetingWorkspaceHeader";
import MeetingWorkspaceStatusBar from "@/components/admin/meetings/workspace/MeetingWorkspaceStatusBar";
import MeetingWorkspaceSectionNav from "@/components/admin/meetings/workspace/MeetingWorkspaceSectionNav";
import MeetingWorkspaceDetailsSection from "@/components/admin/meetings/workspace/MeetingWorkspaceDetailsSection";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import { canEditMeetingDocumentation } from "@/lib/meetings/meeting-workspace-lock";
import {
  MeetingActionsSection,
  MeetingAgendaSection,
  MeetingDecisionsSection,
  MeetingParticipantsSection,
  MeetingTasksSection,
} from "@/components/admin/meetings/workspace/MeetingWorkspaceSections";
import MeetingPendenzenPanel from "@/components/admin/meetings/workspace/MeetingPendenzenPanel";
import type { PendenzListItem } from "@/lib/meetings/meeting-pendenzen";
import { countOpenPendenzen, countOverduePendenzen, mergeMeetingPendenzen } from "@/lib/meetings/meeting-pendenzen";
import { MEETING_ACTION_STATUS_LABEL } from "@/lib/meetings/meeting-protocol-labels";
import type { MeetingWorkspaceTabId } from "@/lib/nav/meeting-workspace-tab-config";
import { countDecisionsAwaitingReview } from "@/lib/meetings/meeting-workspace-status-summary";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";

type MeetingWorkspaceProps = {
  title: string;
  meeting: MeetingLiveData;
  slug: string;
  canManage: boolean;
  actorPersonId: string | null;
  approvalWorkspaceData: MeetingApprovalWorkspaceData;
  initialSubEntities: MeetingSubEntities;
  fmtCfg: TenantFormatConfig;
  relatedTasksPanel?: ReactNode;
  initialPendenzenOpenCount?: number;
  initialPendenzenOverdueCount?: number;
  canDelete?: boolean;
};

const SECTION_TO_TAB: Record<string, MeetingWorkspaceTabId> = {
  "meeting-section-traktanden": "traktanden",
  "meeting-section-beschlüsse": "beschluesse",
  "meeting-section-teilnehmer": "teilnehmer",
  "meeting-section-pendenzen": "pendenzen",
  "meeting-section-massnahmen": "pendenzen",
  "meeting-section-aufgaben": "pendenzen",
};

export default function MeetingWorkspace({
  title,
  meeting,
  slug,
  canManage,
  actorPersonId,
  approvalWorkspaceData,
  initialSubEntities,
  fmtCfg,
  relatedTasksPanel,
  initialPendenzenOpenCount = 0,
  initialPendenzenOverdueCount = 0,
  canDelete = false,
}: MeetingWorkspaceProps) {
  const [agendaItems, setAgendaItems] = useState(initialSubEntities.agendaItems);
  const [participants, setParticipants] = useState(initialSubEntities.participants);
  const [decisions, setDecisions] = useState(initialSubEntities.decisions);
  const [actions, setActions] = useState(initialSubEntities.actions);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<MeetingWorkspaceTabId>("traktanden");
  const [pendenzenTaskRows, setPendenzenTaskRows] = useState<PendenzListItem[]>([]);
  const [pendenzenOpenCount, setPendenzenOpenCount] = useState(initialPendenzenOpenCount);
  const [pendenzenOverdueCount, setPendenzenOverdueCount] = useState(initialPendenzenOverdueCount);
  const [pendenzenRefresh, setPendenzenRefresh] = useState(0);

  useEffect(() => {
    setPendenzenOpenCount(initialPendenzenOpenCount);
    setPendenzenOverdueCount(initialPendenzenOverdueCount);
  }, [initialPendenzenOpenCount, initialPendenzenOverdueCount]);

  const documentationEditable = canEditMeetingDocumentation({
    status: meeting.status,
    reviewStage: meeting.reviewStage,
    protocolApprovalRequired: meeting.protocolApprovalRequired,
  });
  const effectiveCanManage = canManage && documentationEditable;

  const navigateToSection = useCallback((sectionId: string) => {
    const tab = SECTION_TO_TAB[sectionId];
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    function onNavigateTab(event: Event) {
      const detail = (event as CustomEvent<{ tab?: MeetingWorkspaceTabId }>).detail;
      if (detail?.tab) {
        setActiveTab(detail.tab);
      }
    }
    window.addEventListener("meeting-workspace-navigate-tab", onNavigateTab);
    return () => window.removeEventListener("meeting-workspace-navigate-tab", onNavigateTab);
  }, []);

  const pendingDecisionApprovals = countDecisionsAwaitingReview(decisions);

  const mergedPendenzenForBadge = useMemo(
    () =>
      mergeMeetingPendenzen({
        meeting: {
          id: meeting.id,
          title: meeting.title,
          slug,
          meetingDate: meeting.meetingDate,
        },
        actions: actions.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          expectedOutcome: a.expectedOutcome,
          owner: a.owner,
          dueDate: a.dueDate,
          status: a.status,
          statusLabel: MEETING_ACTION_STATUS_LABEL[a.status],
        })),
        tasks: pendenzenTaskRows.map((row) => ({
          id: row.sourceId,
          title: row.title,
          description: row.description,
          dueAt: row.deadline,
          status: row.status as import("@prisma/client").TaskStatus,
          statusLabel: row.statusLabel,
          assigneeLabels: row.ownerLabel ? row.ownerLabel.split(", ") : [],
          contextReference: row.contextReference,
        })),
      }),
    [actions, meeting, pendenzenTaskRows, slug],
  );

  const displayPendenzenOpenCount =
    pendenzenTaskRows.length > 0
      ? countOpenPendenzen(mergedPendenzenForBadge)
      : pendenzenOpenCount;
  const displayPendenzenOverdueCount =
    pendenzenTaskRows.length > 0
      ? countOverduePendenzen(mergedPendenzenForBadge)
      : pendenzenOverdueCount;

  return (
    <>
      <MeetingWorkspaceDirtyStateSync isDirty={isDirty} />
      <div className="space-y-4" data-testid="meeting-workspace">
        <MeetingWorkspaceHeader
          title={title}
          meeting={meeting}
          slug={slug}
          canManage={effectiveCanManage}
          fmtCfg={fmtCfg}
          agendaCount={agendaItems.length}
          participantCount={participants.length}
          decisionCount={decisions.length}
          actionCount={actions.length}
          pendingDecisionApprovals={pendingDecisionApprovals}
          hasInvitedParticipants={participants.some((p) => p.status === "INVITED")}
          onNavigateToSection={navigateToSection}
        />

        <MeetingWorkspaceStatusBar
          meeting={meeting}
          canManage={canManage}
          canDelete={canDelete}
          participants={participants}
          agendaItems={agendaItems}
          decisions={decisions}
          actions={actions}
          slug={slug}
          openPendenzenCount={displayPendenzenOpenCount}
          overduePendenzenCount={displayPendenzenOverdueCount}
        />

        <MeetingWorkspaceSectionNav
          counts={{
            traktanden: agendaItems.length,
            beschluesse: decisions.length,
            pendenzenOpen: displayPendenzenOpenCount,
            teilnehmer: participants.length,
          }}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {activeTab === "traktanden" ? (
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
          ) : null}
          {activeTab === "beschluesse" ? (
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
          ) : null}
          {activeTab === "pendenzen" ? (
            <div className="space-y-4">
              <MeetingPendenzenPanel
                meetingId={meeting.id}
                refreshToken={pendenzenRefresh}
                onSnapshot={(snapshot) => {
                  setPendenzenOpenCount(snapshot.openCount);
                  setPendenzenOverdueCount(snapshot.overdueCount);
                  setPendenzenTaskRows(snapshot.items.filter((i) => i.sourceKind === "AUFGABE"));
                }}
              />
              <MeetingActionsSection
                meetingId={meeting.id}
                canManage={effectiveCanManage}
                items={actions}
                onItemsChange={(next) => {
                  setActions(next);
                  setPendenzenRefresh((n) => n + 1);
                }}
              />
              {relatedTasksPanel ? (
                <MeetingTasksSection relatedTasksPanel={relatedTasksPanel} />
              ) : null}
            </div>
          ) : null}
          {activeTab === "teilnehmer" ? (
            <MeetingParticipantsSection
              meetingId={meeting.id}
              canManage={effectiveCanManage}
              items={participants}
              onItemsChange={setParticipants}
              onDirtyChange={setIsDirty}
            />
          ) : null}
          {activeTab === "details" ? (
            <MeetingWorkspaceDetailsSection
              meeting={meeting}
              slug={slug}
              canManage={canManage}
              actorPersonId={actorPersonId}
              approvalWorkspaceData={approvalWorkspaceData}
              fmtCfg={fmtCfg}
            />
          ) : null}
        </MeetingWorkspaceSectionNav>
      </div>
    </>
  );
}
