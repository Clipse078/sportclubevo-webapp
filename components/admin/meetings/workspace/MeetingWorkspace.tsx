"use client";

import { useCallback, useMemo, useState } from "react";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { MeetingWorkspaceDirtyStateSync } from "@/components/admin/meetings/workspace/MeetingWorkspaceDirtyShell";
import MeetingWorkspaceHeader from "@/components/admin/meetings/workspace/MeetingWorkspaceHeader";
import MeetingWorkspaceStatusBar from "@/components/admin/meetings/workspace/MeetingWorkspaceStatusBar";
import MeetingWorkspaceSectionNav from "@/components/admin/meetings/workspace/MeetingWorkspaceSectionNav";
import MeetingWorkspaceCollapsibleSection from "@/components/admin/meetings/workspace/MeetingWorkspaceCollapsibleSection";
import MeetingWorkspaceDetailsSection from "@/components/admin/meetings/workspace/MeetingWorkspaceDetailsSection";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import { canEditMeetingDocumentation } from "@/lib/meetings/meeting-workspace-lock";
import {
  MeetingAgendaSection,
  MeetingDecisionsSection,
  MeetingParticipantsSection,
} from "@/components/admin/meetings/workspace/MeetingWorkspaceSections";
import MeetingPendenzenPanel from "@/components/admin/meetings/workspace/MeetingPendenzenPanel";
import SceClubDevelopmentSectionShell from "@/components/admin/club-development/SceClubDevelopmentSectionShell";
import { CD_MEETINGS_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { PendenzListItem } from "@/lib/meetings/meeting-pendenzen";
import { countOpenPendenzen, countOverduePendenzen, mergeMeetingPendenzen } from "@/lib/meetings/meeting-pendenzen";
import { MEETING_ACTION_STATUS_LABEL } from "@/lib/meetings/meeting-protocol-labels";
import {
  formatMeetingWorkspaceTabLabel,
  MEETING_WORKSPACE_SECTION_ORDER,
} from "@/lib/nav/meeting-workspace-tab-config";
import { LEGACY_MEETING_SECTION_HASH_TO_TAB } from "@/lib/meetings/meeting-workspace-section-url";
import type { MeetingWorkspaceTabId } from "@/lib/nav/meeting-workspace-tab-config";
import { countDecisionsAwaitingReview } from "@/lib/meetings/meeting-workspace-status-summary";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";
import type { ReactNode } from "react";

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
  const [pendenzenTaskRows, setPendenzenTaskRows] = useState<PendenzListItem[]>([]);
  const [pendenzenOpenCount, setPendenzenOpenCount] = useState(initialPendenzenOpenCount);
  const [pendenzenOverdueCount, setPendenzenOverdueCount] = useState(initialPendenzenOverdueCount);
  const [pendenzenRefresh, setPendenzenRefresh] = useState(0);

  const applyPendenzenSnapshot = useCallback(
    (data: {
      openCount: number;
      overdueCount: number;
      items: Array<{
        sourceKind: PendenzListItem["sourceKind"];
        sourceId: string;
        title: string;
        description: string | null;
        deadline: string | null;
        status: PendenzListItem["status"];
        statusLabel: string;
        ownerLabel: string | null;
        contextReference: string | null;
        meetingDate: string;
      }>;
    }) => {
      setPendenzenOpenCount(data.openCount);
      setPendenzenOverdueCount(data.overdueCount);
      setPendenzenTaskRows(
        data.items
          .filter((i) => i.sourceKind === "AUFGABE")
          .map((i) => ({
            dedupeKey: `aufgabe:${i.sourceId}`,
            sourceKind: "AUFGABE" as const,
            sourceId: i.sourceId,
            title: i.title,
            description: i.description,
            expectedOutcome: null,
            ownerLabel: i.ownerLabel,
            deadline: i.deadline ? new Date(i.deadline) : null,
            status: i.status,
            statusLabel: i.statusLabel,
            isOverdue: false,
            isTerminal: false,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            meetingSlug: slug,
            meetingDate: meeting.meetingDate,
            contextReference: i.contextReference,
          })),
      );
    },
    [meeting.id, meeting.meetingDate, meeting.title, slug],
  );

  const documentationEditable = canEditMeetingDocumentation({
    status: meeting.status,
    reviewStage: meeting.reviewStage,
    protocolApprovalRequired: meeting.protocolApprovalRequired,
  });
  const effectiveCanManage = canManage && documentationEditable;

  const navigateToSection = useCallback((sectionId: string) => {
    const tab: MeetingWorkspaceTabId | undefined =
      LEGACY_MEETING_SECTION_HASH_TO_TAB[sectionId] ?? undefined;
    if (tab) {
      window.dispatchEvent(
        new CustomEvent("meeting-workspace-navigate-tab", { detail: { tab } }),
      );
    }
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

  const displayPendenzenOpenCount = countOpenPendenzen(mergedPendenzenForBadge);
  const displayPendenzenOverdueCount = countOverduePendenzen(mergedPendenzenForBadge);

  const sectionCounts = useMemo(
    () => ({
      traktanden: agendaItems.length,
      beschluesse: decisions.length,
      pendenzenOpen: displayPendenzenOpenCount,
      teilnehmer: participants.length,
    }),
    [
      agendaItems.length,
      decisions.length,
      displayPendenzenOpenCount,
      participants.length,
    ],
  );

  const sectionLabels = useMemo(() => {
    return Object.fromEntries(
      MEETING_WORKSPACE_SECTION_ORDER.map((key) => [
        key,
        formatMeetingWorkspaceTabLabel(key, sectionCounts),
      ]),
    ) as Record<MeetingWorkspaceTabId, string>;
  }, [sectionCounts]);

  return (
    <>
      <MeetingWorkspaceDirtyStateSync isDirty={isDirty} />
      <div className="space-y-4" data-testid="meeting-workspace">
        <SceClubDevelopmentSectionShell
          title={CD_MEETINGS_WORKSPACE_COPY.summarySectionTitle}
          bodyClassName="p-5 space-y-4"
          testId="meeting-workspace-summary"
        >
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
        </SceClubDevelopmentSectionShell>

        <MeetingWorkspaceSectionNav counts={sectionCounts}>
          <MeetingWorkspaceCollapsibleSection
            sectionId="traktanden"
            title={sectionLabels.traktanden}
          >
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
          </MeetingWorkspaceCollapsibleSection>

          <MeetingWorkspaceCollapsibleSection
            sectionId="beschluesse"
            title={sectionLabels.beschluesse}
          >
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
          </MeetingWorkspaceCollapsibleSection>

          <MeetingWorkspaceCollapsibleSection
            sectionId="pendenzen"
            title={sectionLabels.pendenzen}
            lazy
          >
            <MeetingPendenzenPanel
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              meetingSlug={slug}
              meetingDate={meeting.meetingDate}
              canManage={effectiveCanManage}
              actions={actions}
              onActionsChange={(next) => {
                setActions(next);
                setPendenzenRefresh((n) => n + 1);
              }}
              relatedTasksCreateSlot={relatedTasksPanel}
              refreshToken={pendenzenRefresh}
              onSnapshot={(snapshot) => {
                applyPendenzenSnapshot({
                  openCount: snapshot.openCount,
                  overdueCount: snapshot.overdueCount,
                  items: snapshot.items.map((i) => ({
                    sourceKind: i.sourceKind,
                    sourceId: i.sourceId,
                    title: i.title,
                    description: i.description,
                    deadline: i.deadline?.toISOString() ?? null,
                    status: i.status,
                    statusLabel: i.statusLabel,
                    ownerLabel: i.ownerLabel,
                    contextReference: i.contextReference,
                    meetingDate: i.meetingDate.toISOString(),
                  })),
                });
              }}
            />
          </MeetingWorkspaceCollapsibleSection>

          <MeetingWorkspaceCollapsibleSection
            sectionId="teilnehmer"
            title={sectionLabels.teilnehmer}
          >
            <MeetingParticipantsSection
              meetingId={meeting.id}
              canManage={effectiveCanManage}
              items={participants}
              onItemsChange={setParticipants}
              onDirtyChange={setIsDirty}
            />
          </MeetingWorkspaceCollapsibleSection>

          <MeetingWorkspaceCollapsibleSection sectionId="details" title={sectionLabels.details}>
            <MeetingWorkspaceDetailsSection
              meeting={meeting}
              slug={slug}
              canManage={canManage}
              actorPersonId={actorPersonId}
              approvalWorkspaceData={approvalWorkspaceData}
              fmtCfg={fmtCfg}
            />
          </MeetingWorkspaceCollapsibleSection>
        </MeetingWorkspaceSectionNav>
      </div>
    </>
  );
}