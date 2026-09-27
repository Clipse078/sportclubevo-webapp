import { logAction } from "@/lib/audit/log-action";

export type TeamPollAuditAction =
  | "POLL_CREATED"
  | "POLL_PUBLISHED"
  | "POLL_CLOSED"
  | "POLL_RESPONSE_SUBMITTED"
  | "DATE_POLL_OPTION_SELECTED"
  | "DATE_POLL_EVENT_CREATED";

export async function recordTeamPollAudit(input: {
  tenantId: string;
  actorUserId: string | null;
  action: TeamPollAuditAction;
  communicationId: string;
  teamId?: string;
  kind?: string;
  pollId?: string;
  eventId?: string;
}): Promise<void> {
  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType: "PlatformCommunication",
    entityId: input.communicationId,
    action: input.action,
    afterJson: {
      communicationId: input.communicationId,
      teamId: input.teamId,
      kind: input.kind,
      pollId: input.pollId,
      eventId: input.eventId,
    },
  });
}
