/**
 * PATCH — protocol approval config; POST — approver vote (SCE-CD-02R9).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { MeetingApprovalRule } from "@prisma/client";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { recordProtocolApprovalVote } from "@/lib/meetings/meeting-protocol-approval-service";
import {
  resolveMeetingPersonSnapshot,
  resolvePersonIdForUser,
} from "@/lib/meetings/meeting-person-payload";
import {
  canConfigureProtocolApproval,
  validateApprovalConfig,
} from "@/lib/meetings/meeting-approval-presentation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([PERMISSIONS.MEETINGS_MANAGE]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const { actor, tenantId } = access.context;
  const guard = await requireMeetingAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;

  const existing = await prisma.meeting.findFirst({
    where: { id, tenantId: tenantId! },
    select: {
      status: true,
      reviewStage: true,
      protocolApprovalRequired: true,
      protocolApprovalRule: true,
      protocolApproverPersonIds: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Sitzung nicht gefunden." }, { status: 404 });
  }
  if (
    !canConfigureProtocolApproval({
      status: existing.status,
      reviewStage: existing.reviewStage,
    })
  ) {
    return NextResponse.json(
      { error: "Protokoll-Freigabe kann nach Einreichung nicht mehr konfiguriert werden." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const protocolApprovalRequired =
    typeof body?.protocolApprovalRequired === "boolean" ? body.protocolApprovalRequired : undefined;
  const ruleRaw = body?.protocolApprovalRule as MeetingApprovalRule | undefined;
  const validRules = Object.values(MeetingApprovalRule);
  const protocolApprovalRule =
    ruleRaw && validRules.includes(ruleRaw) ? ruleRaw : undefined;

  let protocolApproverPersonIds: string[] | undefined;
  if (Array.isArray(body?.protocolApproverPersonIds)) {
    const validated: string[] = [];
    const seen = new Set<string>();
    for (const rawId of body.protocolApproverPersonIds) {
      if (typeof rawId !== "string" || !rawId.trim()) continue;
      const snap = await resolveMeetingPersonSnapshot(tenantId!, rawId.trim());
      if (!snap) {
        return NextResponse.json({ error: "Ungültige Person in Prüferliste." }, { status: 400 });
      }
      if (seen.has(snap.personId)) continue;
      seen.add(snap.personId);
      validated.push(snap.personId);
    }
    protocolApproverPersonIds = validated;
  }

  const nextRequired = protocolApprovalRequired ?? existing.protocolApprovalRequired;
  const nextApproverIds = protocolApproverPersonIds ??
    (Array.isArray(existing.protocolApproverPersonIds)
      ? (existing.protocolApproverPersonIds as string[])
      : []);
  const configError = validateApprovalConfig({
    approvalRequired: nextRequired,
    approverPersonIds: nextApproverIds,
  });
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 400 });
  }

  const updated = await prisma.meeting.update({
    where: { id, tenantId: tenantId! },
    data: {
      protocolApprovalRequired,
      protocolApprovalRule,
      protocolApproverPersonIds: protocolApproverPersonIds ?? undefined,
    },
    select: {
      id: true,
      protocolApprovalRequired: true,
      protocolApprovalRule: true,
      protocolApproverPersonIds: true,
    },
  });

  void logAuditEvent({
    actorUserId: actor.userId,
    module: "meetings",
    entityId: id,
    action: "PROTOCOL_APPROVAL_CONFIG",
    after: updated,
  });

  return NextResponse.json({ meeting: updated });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.MEETINGS_VIEW,
    PERMISSIONS.MEETINGS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const { actor, tenantId } = access.context;
  const guard = await requireMeetingAccess({ actor, id, access: "read" });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const approverPersonId = typeof body?.approverPersonId === "string" ? body.approverPersonId.trim() : "";
  const decision = body?.decision;
  const validDecisions = ["APPROVED", "REJECTED", "CHANGES_REQUESTED"] as const;
  if (!approverPersonId || !validDecisions.includes(decision)) {
    return NextResponse.json({ error: "Ungültige Freigabe-Anfrage." }, { status: 400 });
  }

  const actorPersonId = await resolvePersonIdForUser(tenantId!, actor.userId);

  try {
    const result = await recordProtocolApprovalVote({
      tenantId: tenantId!,
      meetingId: id,
      approverPersonId,
      actorUserId: actor.userId,
      actorPersonId,
      decision,
      comment: body?.comment,
      clientRequestId: body?.clientRequestId,
    });

    void logAuditEvent({
      actorUserId: actor.userId,
      module: "meetings",
      entityId: id,
      action: "PROTOCOL_APPROVAL_VOTE",
      metadata: { approverPersonId, decision, reviewStage: result.reviewStage },
    });

    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = ["NOT_AUTHORIZED_APPROVER", "APPROVER_IDENTITY_MISMATCH"].includes(code) ? 403 : 422;
    const messages: Record<string, string> = {
      APPROVAL_NOT_ENABLED: "Protokoll-Freigabe ist nicht konfiguriert.",
      NOT_AUTHORIZED_APPROVER: "Keine Berechtigung für diese Freigabe.",
      APPROVER_IDENTITY_MISMATCH: "Freigabe nur im eigenen Namen möglich.",
      NOT_AWAITING_APPROVAL: "Protokoll wartet nicht auf Freigabe.",
    };
    return NextResponse.json({ error: messages[code] ?? "Freigabe fehlgeschlagen." }, { status });
  }
}
