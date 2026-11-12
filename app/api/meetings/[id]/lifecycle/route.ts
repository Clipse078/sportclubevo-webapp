/**
 * PATCH /api/meetings/[id]/lifecycle — conduct, close, reopen, cancel (SCE-CD-02R9).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { MeetingStatus } from "@prisma/client";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent, type GovernanceAction } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import {
  closeMeeting,
  markMeetingConducted,
  reopenMeeting,
  submitProtocolForApproval,
} from "@/lib/meetings/meeting-lifecycle-service";

type RouteContext = { params: Promise<{ id: string }> };

function lifecycleAuditAction(action: string): GovernanceAction {
  switch (action) {
    case "conduct":
      return "LIFECYCLE_CONDUCT";
    case "close":
      return "LIFECYCLE_CLOSE";
    case "reopen":
      return "LIFECYCLE_REOPEN";
    case "submit_protocol":
      return "LIFECYCLE_SUBMIT_PROTOCOL";
    case "cancel":
      return "LIFECYCLE_CANCEL";
    default:
      return "LIFECYCLE_UNKNOWN";
  }
}

const MEETING_LIFECYCLE_SELECT = {
  id: true,
  tenantId: true,
  status: true,
  title: true,
  description: true,
  reviewStage: true,
  protocolApprovalRequired: true,
  protocolApprovalRule: true,
  protocolApproverPersonIds: true,
  protocolApprovedContentHash: true,
  protocolContentRevision: true,
  conductedAt: true,
} as const;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([PERMISSIONS.MEETINGS_MANAGE]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const { actor } = access.context;

  const guard = await requireMeetingAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;

  const meeting = await prisma.meeting.findFirst({
    where: { id, tenantId: actor.tenantId },
    select: MEETING_LIFECYCLE_SELECT,
  });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting nicht gefunden." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action as string;

  try {
    switch (action) {
      case "conduct":
        await markMeetingConducted({ meeting, actorUserId: actor.userId });
        break;
      case "close":
        await closeMeeting({ meeting, actorUserId: actor.userId });
        break;
      case "reopen": {
        const reason = typeof body?.reason === "string" ? body.reason : "";
        await reopenMeeting({ meeting, actorUserId: actor.userId, reason });
        break;
      }
      case "submit_protocol":
        await submitProtocolForApproval({ meeting, actorUserId: actor.userId });
        break;
      case "cancel":
        if (meeting.status === MeetingStatus.COMPLETED) {
          return NextResponse.json({ error: "Abgeschlossene Sitzung kann nicht abgesagt werden." }, { status: 422 });
        }
        await prisma.$transaction([
          prisma.meeting.update({
            where: { id, tenantId: actor.tenantId },
            data: { status: MeetingStatus.CANCELLED },
          }),
          prisma.meetingLifecycleEvent.create({
            data: {
              tenantId: actor.tenantId!,
              meetingId: id,
              kind: "CANCELLED",
              actorUserId: actor.userId,
            },
          }),
        ]);
        break;
      default:
        return NextResponse.json({ error: "Ungültige Aktion." }, { status: 400 });
    }

    const updated = await prisma.meeting.findFirst({
      where: { id, tenantId: actor.tenantId },
      select: {
        id: true,
        status: true,
        conductedAt: true,
        closedAt: true,
        reviewStage: true,
      },
    });

    void logAuditEvent({
      actorUserId: actor.userId,
      module: "meetings",
      entityId: id,
      action: lifecycleAuditAction(action),
      after: updated,
    });

    return NextResponse.json({ meeting: updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const messages: Record<string, string> = {
      INVALID_STATE: "Aktion im aktuellen Status nicht möglich.",
      CANCELLED: "Abgesagte Sitzung kann nicht abgeschlossen werden.",
      APPROVAL_PENDING: "Protokoll-Freigabe ist noch ausstehend.",
      APPROVAL_REJECTED: "Protokoll wurde abgelehnt oder Änderungen verlangt.",
      APPROVAL_REQUIRED: "Freigabe-Konfiguration unvollständig.",
      REASON_REQUIRED: "Begründung für Wieder öffnen ist erforderlich (mind. 3 Zeichen).",
      NOT_CLOSED: "Nur abgeschlossene Sitzungen können wieder geöffnet werden.",
      APPROVAL_NOT_ENABLED: "Protokoll-Freigabe ist nicht aktiviert.",
      NO_APPROVERS: "Keine Prüfer für Protokoll-Freigabe ausgewählt.",
    };
    return NextResponse.json(
      { error: messages[code] ?? "Aktion fehlgeschlagen." },
      { status: code === "NOT_AUTHORIZED_APPROVER" ? 403 : 422 },
    );
  }
}
