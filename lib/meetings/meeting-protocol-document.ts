import {
  ReviewWorkflowStage,
  type MeetingApprovalDecisionKind,
  type MeetingStatus,
  type TaskStatus,
} from "@prisma/client";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import {
  formatDateShort,
  formatDateTimeCompact,
  formatTime,
} from "@/lib/tenant-runtime/formatters";
import type { MeetingApprovalVoteView } from "@/lib/meetings/meeting-approval-workspace-data";
import {
  meetingApprovalAggregateStatusLabel,
  meetingApprovalVoteDecisionLabel,
  protocolReviewStageStatusLabel,
} from "@/lib/meetings/meeting-approval-presentation";
import { MEETING_AGENDA_ITEM_STATUS_LABEL } from "@/lib/meetings/agenda-item-presentation";
import { buildCanonicalAgendaDisplayOrderMap } from "@/lib/meetings/agenda-display-order";
import { resolveStoredPersonDisplayName } from "@/lib/meetings/meeting-person-display";
import { parseMeetingLinkedRefs } from "@/lib/meetings/meeting-protocol-linked-refs";
import { decodeMeetingLocationForProtocol } from "@/lib/meetings/meeting-protocol-location";
import {
  MEETING_ACTION_STATUS_LABEL,
  MEETING_DECISION_STATUS_LABEL,
  MEETING_LIFECYCLE_STATUS_LABEL,
  MEETING_PARTICIPANT_ATTENDANCE_GROUPS,
  MEETING_PARTICIPANT_STATUS_LABEL,
  PROTOCOL_NOT_RECORDED,
} from "@/lib/meetings/meeting-protocol-labels";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";

export type MeetingProtocolTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  statusLabel: string;
  dueAtLabel: string | null;
  assigneeLabels: string[];
  contextReference: string | null;
};

export type MeetingProtocolDocumentDecision = {
  id: string;
  title: string;
  description: string | null;
  rationale: string | null;
  statusLabel: string;
  ownerLabel: string | null;
  approvalRequired: boolean;
  approvalStatusLabel: string;
  approvalVotes: Array<{
    approverLabel: string;
    decisionLabel: string;
    decidedAtLabel: string | null;
    comment: string | null;
  }>;
  sourceAgendaItemId: string | null;
};

export type MeetingProtocolDocumentAction = {
  id: string;
  title: string;
  description: string | null;
  expectedOutcome: string | null;
  ownerLabel: string | null;
  dueDateLabel: string | null;
  statusLabel: string;
  linkedAgendaItemId: string | null;
  linkedDecisionId: string | null;
};

export type MeetingProtocolDocumentAgendaItem = {
  id: string;
  orderNumber: number;
  title: string;
  backgroundText: string | null;
  protocolNotes: string | null;
  presenterLabel: string | null;
  statusLabel: string;
  durationLabel: string | null;
  initiativeTitle: string | null;
  decisions: MeetingProtocolDocumentDecision[];
  actions: MeetingProtocolDocumentAction[];
};

export type MeetingProtocolMetadataRow = {
  label: string;
  value: string;
};

export type MeetingProtocolAttendanceGroup = {
  heading: string;
  entries: Array<{ name: string; role: string | null }>;
};

export type MeetingProtocolAttendanceRow = {
  name: string;
  roleLabel: string;
  attendanceLabel: string;
};

export type MeetingProtocolDocumentModel = {
  tenantName: string;
  tenantLogoUrl: string | null;
  tenantAccentColor: string;
  documentLabel: string;
  meetingTitle: string;
  draftBanner: string | null;
  approvalStateLabel: string;
  exportGeneratedAtLabel: string;
  metadataRows: MeetingProtocolMetadataRow[];
  attendanceGroups: MeetingProtocolAttendanceGroup[];
  attendanceRows: MeetingProtocolAttendanceRow[];
  agendaOverview: Array<{ orderNumber: number; title: string }>;
  agendaItems: MeetingProtocolDocumentAgendaItem[];
  unlinkedDecisions: MeetingProtocolDocumentDecision[];
  unlinkedActions: MeetingProtocolDocumentAction[];
  meetingTasks: MeetingProtocolTaskRow[];
  pendenzenOverviewFootnote: string;
  meetingDescription: string | null;
  protocolApprovalVoteRows: Array<{
    approverLabel: string;
    decisionLabel: string;
    decidedAtLabel: string | null;
    comment: string | null;
  }>;
  protocolApprovalFootnote: string | null;
  showLiveTaskStateNotice: boolean;
  secondaryFooter: string;
  tenantFooterLine: string;
  showHeaderApprovalState: boolean;
  referencedPendenzen: MeetingProtocolPendenzRow[];
};

export const MEETING_PROTOCOL_PENDENZEN_OVERVIEW_FOOTNOTE =
  "Aktueller Stand zum Exportzeitpunkt. Enthält die dieser Sitzung zugeordneten offenen Massnahmen und Aufgaben.";

export type MeetingProtocolPendenzRow = {
  sourceTypeLabel: "Massnahme" | "Aufgabe";
  title: string;
  ownerLabel: string;
  dueDateLabel: string;
  statusLabel: string;
  sourceMeetingLabel: string | null;
  compactSummary: string | null;
};

export type BuildMeetingProtocolDocumentInput = {
  meeting: MeetingLiveData;
  subEntities: MeetingSubEntities;
  tenant: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    locale?: string | null;
    timezone?: string | null;
  };
  exportedAt: Date;
  protocolVotes: MeetingApprovalVoteView[];
  decisionVotesByDecisionId: Record<string, MeetingApprovalVoteView[]>;
  meetingTasks: MeetingProtocolTaskRow[];
  decisionTasksByDecisionId: Record<string, MeetingProtocolTaskRow[]>;
};

function tenantFormatConfig(input: BuildMeetingProtocolDocumentInput): TenantFormatConfig {
  return {
    locale: input.tenant.locale,
    timezone: input.tenant.timezone,
  };
}

function formatOptionalDate(value: Date | null | undefined, cfg: TenantFormatConfig): string | null {
  if (!value) return null;
  return formatDateShort(value, cfg);
}

function mapDecision(
  decision: MeetingSubEntities["decisions"][number],
  cfg: TenantFormatConfig,
  votes: MeetingApprovalVoteView[],
): MeetingProtocolDocumentDecision {
  return {
    id: decision.id,
    title: decision.title,
    description: decision.description,
    rationale: decision.rationale,
    statusLabel: MEETING_DECISION_STATUS_LABEL[decision.status],
    ownerLabel: resolveStoredPersonDisplayName({
      name: decision.owner,
      personId: decision.ownerPersonId,
    }),
    approvalRequired: decision.approvalRequired,
    approvalStatusLabel: meetingApprovalAggregateStatusLabel(decision.approvalStatus),
    approvalVotes: votes.map((vote) => ({
      approverLabel: vote.approverLabel,
      decisionLabel: meetingApprovalVoteDecisionLabel(vote.decision),
      decidedAtLabel: vote.decidedAt ? formatDateTimeCompact(vote.decidedAt, cfg) : null,
      comment: vote.comment,
    })),
    sourceAgendaItemId: decision.sourceAgendaItemId,
  };
}

function mapAction(
  action: MeetingSubEntities["actions"][number],
  cfg: TenantFormatConfig,
): MeetingProtocolDocumentAction {
  const links = parseMeetingLinkedRefs(action.linkedRefs);
  return {
    id: action.id,
    title: action.title,
    description: action.description,
    expectedOutcome: action.expectedOutcome,
    ownerLabel: resolveStoredPersonDisplayName({
      name: action.owner,
      personId: action.ownerPersonId,
    }),
    dueDateLabel: formatOptionalDate(action.dueDate, cfg),
    statusLabel: MEETING_ACTION_STATUS_LABEL[action.status],
    linkedAgendaItemId: links.agendaItemId ?? null,
    linkedDecisionId: links.decisionId ?? null,
  };
}

function resolveAgendaBackground(item: MeetingSubEntities["agendaItems"][number]): string | null {
  const initiative = item.initiative;
  if (initiative) {
    const fromSummary = initiative.summary?.trim();
    if (fromSummary) return fromSummary;
    const fromDescription = initiative.description?.trim();
    if (fromDescription) return fromDescription;
  }
  return null;
}

function buildMetadataRows(
  meeting: MeetingLiveData,
  cfg: TenantFormatConfig,
): MeetingProtocolMetadataRow[] {
  const location = decodeMeetingLocationForProtocol(meeting.location);
  const rows: MeetingProtocolMetadataRow[] = [
    {
      label: "Datum",
      value: formatDateShort(meeting.meetingDate, cfg),
    },
    {
      label: "Beginn (geplant)",
      value: formatTime(meeting.meetingDate, cfg),
    },
  ];

  if (meeting.conductedAt) {
    rows.push({
      label: "Beginn (tatsächlich)",
      value: formatTime(meeting.conductedAt, cfg),
    });
  }

  if (meeting.closedAt) {
    rows.push({
      label: "Ende (tatsächlich)",
      value: formatTime(meeting.closedAt, cfg),
    });
  } else if (meeting.plannedDurationMin != null && meeting.plannedDurationMin > 0) {
    const plannedEnd = new Date(
      meeting.meetingDate.getTime() + meeting.plannedDurationMin * 60_000,
    );
    rows.push({
      label: "Geplantes Ende",
      value: formatTime(plannedEnd, cfg),
    });
    rows.push({
      label: "Geplante Dauer",
      value: `${meeting.plannedDurationMin} Min.`,
    });
  }

  rows.push({
    label: "Ort",
    value: location ?? PROTOCOL_NOT_RECORDED,
  });

  rows.push({
    label: "Sitzungsstatus",
    value: MEETING_LIFECYCLE_STATUS_LABEL[meeting.status],
  });

  rows.push({
    label: "Protokollfreigabe",
    value: protocolReviewStageStatusLabel(meeting.reviewStage, meeting.protocolApprovalRequired),
  });

  return rows;
}

function resolveDraftBanner(status: MeetingStatus): string | null {
  if (status === "PLANNED") {
    return "ENTWURF — Sitzung noch nicht durchgeführt";
  }
  if (status === "CANCELLED") {
    return "ENTWURF — Sitzung abgesagt";
  }
  return null;
}

function resolveApprovalStateLabel(meeting: MeetingLiveData): string {
  if (meeting.status === "PLANNED" || meeting.status === "CANCELLED") {
    return "";
  }
  if (!meeting.protocolApprovalRequired) {
    return "Protokollfreigabe nicht erforderlich";
  }
  return protocolReviewStageStatusLabel(meeting.reviewStage, true);
}

function buildAttendanceGroups(
  participants: MeetingSubEntities["participants"],
): MeetingProtocolAttendanceGroup[] {
  return MEETING_PARTICIPANT_ATTENDANCE_GROUPS.map(({ status, heading }) => {
    const entries = participants
      .filter((p) => p.status === status)
      .map((p) => ({
        name: p.name.trim() || PROTOCOL_NOT_RECORDED,
        role: p.role?.trim() || null,
      }));
    return { heading, entries };
  }).filter((group) => group.entries.length > 0);
}

function buildAttendanceRows(
  participants: MeetingSubEntities["participants"],
): MeetingProtocolAttendanceRow[] {
  const order: Array<keyof typeof MEETING_PARTICIPANT_STATUS_LABEL> = [
    "PRESENT",
    "EXCUSED",
    "ABSENT",
    "INVITED",
  ];

  return [...participants]
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
    .map((p) => ({
      name: p.name.trim() || PROTOCOL_NOT_RECORDED,
      roleLabel: p.role?.trim() || PROTOCOL_NOT_RECORDED,
      attendanceLabel: MEETING_PARTICIPANT_STATUS_LABEL[p.status],
    }));
}

function buildReferencedPendenzenForProtocol(
  actions: MeetingSubEntities["actions"],
  tasks: MeetingProtocolTaskRow[],
  cfg: TenantFormatConfig,
): MeetingProtocolPendenzRow[] {
  const terminalAction = new Set(["DONE", "CANCELLED"]);
  const terminalTask = new Set<TaskStatus>(["DONE", "CANCELLED"]);
  const rows: MeetingProtocolPendenzRow[] = actions
    .filter((a) => !terminalAction.has(a.status))
    .map((action) => {
      const owner = resolveStoredPersonDisplayName({
        name: action.owner,
        personId: action.ownerPersonId,
      });
      const summary =
        action.expectedOutcome?.trim() ||
        action.description?.trim()?.slice(0, 160) ||
        null;
      return {
        sourceTypeLabel: "Massnahme" as const,
        title: action.title,
        ownerLabel: owner ?? PROTOCOL_NOT_RECORDED,
        dueDateLabel: formatOptionalDate(action.dueDate, cfg) ?? PROTOCOL_NOT_RECORDED,
        statusLabel: MEETING_ACTION_STATUS_LABEL[action.status],
        sourceMeetingLabel: null,
        compactSummary: summary,
      };
    });

  for (const task of tasks) {
    if (terminalTask.has(task.status)) continue;
    rows.push({
      sourceTypeLabel: "Aufgabe",
      title: task.title,
      ownerLabel:
        task.assigneeLabels.length > 0 ? task.assigneeLabels.join(", ") : PROTOCOL_NOT_RECORDED,
      dueDateLabel: task.dueAtLabel ?? PROTOCOL_NOT_RECORDED,
      statusLabel: task.statusLabel,
      sourceMeetingLabel: task.contextReference,
      compactSummary: task.description?.trim()?.slice(0, 160) ?? null,
    });
  }

  return rows;
}

function buildProtocolApprovalFootnote(meeting: MeetingLiveData): string | null {
  if (!meeting.protocolApprovalRequired) {
    return null;
  }
  if (meeting.reviewStage === ReviewWorkflowStage.APPROVED) {
    return "Der Protokollfreigabe-Fingerabdruck umfasst Titel, Beschreibung sowie Titel der Traktanden und Beschlüsse. Begründungen, Massnahmen-Details und Aufgabenstände können sich nach Freigabe ändern.";
  }
  return "Dieses Dokument ist kein unveränderlicher Freigabe-Snapshot, solange die Protokollfreigabe noch aussteht oder Inhalte nach Freigabe angepasst wurden.";
}

export function buildMeetingProtocolDocument(
  input: BuildMeetingProtocolDocumentInput,
): MeetingProtocolDocumentModel {
  const cfg = tenantFormatConfig(input);
  const { meeting, subEntities } = input;

  const mappedDecisions = subEntities.decisions.map((d) =>
    mapDecision(d, cfg, input.decisionVotesByDecisionId[d.id] ?? []),
  );
  const mappedActions = subEntities.actions.map((a) => mapAction(a, cfg));

  const decisionsByAgenda = new Map<string, MeetingProtocolDocumentDecision[]>();
  const unlinkedDecisions: MeetingProtocolDocumentDecision[] = [];

  for (const decision of mappedDecisions) {
    if (decision.sourceAgendaItemId) {
      const bucket = decisionsByAgenda.get(decision.sourceAgendaItemId) ?? [];
      bucket.push(decision);
      decisionsByAgenda.set(decision.sourceAgendaItemId, bucket);
    } else {
      unlinkedDecisions.push(decision);
    }
  }

  const actionsByAgenda = new Map<string, MeetingProtocolDocumentAction[]>();
  const actionsByDecision = new Map<string, MeetingProtocolDocumentAction[]>();
  const unlinkedActions: MeetingProtocolDocumentAction[] = [];

  for (const action of mappedActions) {
    if (action.linkedAgendaItemId) {
      const bucket = actionsByAgenda.get(action.linkedAgendaItemId) ?? [];
      bucket.push(action);
      actionsByAgenda.set(action.linkedAgendaItemId, bucket);
    } else if (action.linkedDecisionId) {
      const bucket = actionsByDecision.get(action.linkedDecisionId) ?? [];
      bucket.push(action);
      actionsByDecision.set(action.linkedDecisionId, bucket);
    } else {
      unlinkedActions.push(action);
    }
  }

  const displayOrderByAgendaId = buildCanonicalAgendaDisplayOrderMap(subEntities.agendaItems);

  const agendaItems: MeetingProtocolDocumentAgendaItem[] = subEntities.agendaItems.map((item) => {
    const orderNumber = displayOrderByAgendaId.get(item.id) ?? 0;
    const itemDecisions = decisionsByAgenda.get(item.id) ?? [];
    const itemActions = actionsByAgenda.get(item.id) ?? [];

    for (const decision of itemDecisions) {
      const linkedToDecision = actionsByDecision.get(decision.id) ?? [];
      itemActions.push(...linkedToDecision);
    }

    const duration =
      item.durationMin != null && item.durationMin > 0 ? `${item.durationMin} Min.` : null;

    return {
      id: item.id,
      orderNumber,
      title: item.title,
      backgroundText: resolveAgendaBackground(item),
      protocolNotes: item.notes?.trim() || null,
      presenterLabel: resolveStoredPersonDisplayName({
        name: item.owner,
        personId: item.ownerPersonId,
      }),
      statusLabel: MEETING_AGENDA_ITEM_STATUS_LABEL[item.status],
      durationLabel: duration,
      initiativeTitle: item.initiative?.title ?? null,
      decisions: itemDecisions,
      actions: itemActions,
    };
  });

  const allMeetingTasks = [...input.meetingTasks];
  for (const rows of Object.values(input.decisionTasksByDecisionId)) {
    for (const task of rows) {
      if (!allMeetingTasks.some((t) => t.id === task.id)) {
        allMeetingTasks.push(task);
      }
    }
  }

  return {
    tenantName: input.tenant.name,
    tenantLogoUrl: input.tenant.logoUrl,
    tenantAccentColor: input.tenant.primaryColor,
    documentLabel: "Sitzungsprotokoll",
    meetingTitle: meeting.title,
    draftBanner: resolveDraftBanner(meeting.status),
    approvalStateLabel: resolveApprovalStateLabel(meeting),
    showHeaderApprovalState: resolveApprovalStateLabel(meeting).length > 0,
    exportGeneratedAtLabel: formatDateTimeCompact(input.exportedAt, cfg),
    metadataRows: buildMetadataRows(meeting, cfg),
    attendanceGroups: buildAttendanceGroups(subEntities.participants),
    attendanceRows: buildAttendanceRows(subEntities.participants),
    agendaOverview: agendaItems.map((item) => ({
      orderNumber: item.orderNumber,
      title: item.title,
    })),
    agendaItems,
    unlinkedDecisions,
    unlinkedActions,
    meetingTasks: allMeetingTasks,
    pendenzenOverviewFootnote: MEETING_PROTOCOL_PENDENZEN_OVERVIEW_FOOTNOTE,
    meetingDescription: meeting.description?.trim() || null,
    protocolApprovalVoteRows: input.protocolVotes.map((vote) => ({
      approverLabel: vote.approverLabel,
      decisionLabel: meetingApprovalVoteDecisionLabel(vote.decision),
      decidedAtLabel: vote.decidedAt ? formatDateTimeCompact(vote.decidedAt, cfg) : null,
      comment: vote.comment,
    })),
    protocolApprovalFootnote: buildProtocolApprovalFootnote(meeting),
    showLiveTaskStateNotice: allMeetingTasks.length > 0,
    secondaryFooter: "SportClubEvo",
    tenantFooterLine: `${input.tenant.name} · Sitzungsprotokoll`,
    referencedPendenzen: buildReferencedPendenzenForProtocol(subEntities.actions, allMeetingTasks, cfg),
  };
}

export function mapContextTaskToProtocolRow(task: {
  id: string;
  title: string;
  status: TaskStatus;
  dueAt: string | null;
  assignees: Array<{ firstName: string; lastName: string }>;
  contextReference?: string | null;
}): MeetingProtocolTaskRow {
  const assigneeLabels = task.assignees
    .map((a) => `${a.firstName} ${a.lastName}`.trim())
    .filter(Boolean);
  return {
    id: task.id,
    title: task.title,
    description: null,
    status: task.status,
    statusLabel: TASK_STATUS_LABELS[task.status],
    dueAtLabel: task.dueAt ? task.dueAt : null,
    assigneeLabels,
    contextReference: task.contextReference ?? null,
  };
}

export function meetingParticipantStatusLabel(
  status: keyof typeof MEETING_PARTICIPANT_STATUS_LABEL,
): string {
  return MEETING_PARTICIPANT_STATUS_LABEL[status];
}

export type { MeetingApprovalDecisionKind };
