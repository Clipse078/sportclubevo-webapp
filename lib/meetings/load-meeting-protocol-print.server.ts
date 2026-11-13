import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { resolveTenantBranding } from "@/lib/tenant-runtime/branding";
import { getMeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import {
  buildMeetingProtocolDocument,
  mapContextTaskToProtocolRow,
  type MeetingProtocolDocumentModel,
  type MeetingProtocolTaskRow,
} from "@/lib/meetings/meeting-protocol-document";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";
import { listTasksForContext } from "@/lib/tasks/list-tasks-for-context";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import type { ContextRelatedTaskSummaryDto } from "@/lib/tasks/context-related-task-types";
import { formatDateShort, type TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

function mapTaskSummary(
  task: ContextRelatedTaskSummaryDto,
  cfg: TenantFormatConfig,
  contextReference: string | null,
): MeetingProtocolTaskRow {
  return mapContextTaskToProtocolRow({
    id: task.id,
    title: task.title,
    status: task.status,
    dueAt: task.dueAt ? formatDateShort(task.dueAt, cfg) : null,
    assignees: task.assignees.map((a) => ({
      firstName: a.firstName,
      lastName: a.lastName,
    })),
    contextReference,
  });
}

async function loadAuthorizedMeetingTasks(
  meetingId: string,
  cfg: TenantFormatConfig,
): Promise<MeetingProtocolTaskRow[]> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return [];
  try {
    const page = await listTasksForContext(ctx, TaskContextType.MEETING, meetingId, { limit: 50 });
    return page.tasks.map((task) => mapTaskSummary(task, cfg, "Sitzung"));
  } catch {
    return [];
  }
}

async function loadAuthorizedDecisionTasks(
  subEntities: MeetingSubEntities,
  cfg: TenantFormatConfig,
): Promise<Record<string, MeetingProtocolTaskRow[]>> {
  const ctx = await getTaskServiceContext();
  if (!ctx) return {};

  const byDecisionId: Record<string, MeetingProtocolTaskRow[]> = {};
  await Promise.all(
    subEntities.decisions.map(async (decision) => {
      try {
        const page = await listTasksForContext(
          ctx,
          TaskContextType.MEETING_DECISION,
          decision.id,
          { limit: 50 },
        );
        byDecisionId[decision.id] = page.tasks.map((task) =>
          mapTaskSummary(task, cfg, `Beschluss: ${decision.title}`),
        );
      } catch {
        byDecisionId[decision.id] = [];
      }
    }),
  );
  return byDecisionId;
}

export async function loadMeetingProtocolDocumentModel(input: {
  actor: ActorContext;
  meeting: MeetingLiveData;
  subEntities: MeetingSubEntities;
  exportedAt?: Date;
}): Promise<MeetingProtocolDocumentModel | null> {
  const tenantId = input.actor.tenantId;
  if (!tenantId) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      locale: true,
      timezone: true,
    },
  });
  if (!tenant) return null;

  const branding = resolveTenantBranding(tenant);
  const cfg: TenantFormatConfig = { locale: tenant.locale, timezone: tenant.timezone };

  const decisionApproverIds: Record<string, unknown> = {};
  for (const decision of input.subEntities.decisions) {
    if (decision.approvalRequired) {
      decisionApproverIds[decision.id] = decision.approverPersonIds;
    }
  }

  const [approvalData, meetingTasks, decisionTasksByDecisionId] = await Promise.all([
    getMeetingApprovalWorkspaceData({
      tenantId,
      meetingId: input.meeting.id,
      protocolApproverPersonIds: input.meeting.protocolApproverPersonIds,
      decisionApproverIdsByDecisionId: decisionApproverIds,
    }),
    loadAuthorizedMeetingTasks(input.meeting.id, cfg),
    loadAuthorizedDecisionTasks(input.subEntities, cfg),
  ]);

  return buildMeetingProtocolDocument({
    meeting: input.meeting,
    subEntities: input.subEntities,
    tenant: {
      name: tenant.name,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      locale: tenant.locale,
      timezone: tenant.timezone,
    },
    exportedAt: input.exportedAt ?? new Date(),
    protocolVotes: approvalData.protocolVotes,
    decisionVotesByDecisionId: approvalData.decisionVotesByDecisionId,
    meetingTasks,
    decisionTasksByDecisionId,
  });
}
