/**
 * PATCH — Initiative approval config; POST — approver vote (SCE-CD-03R2).
 */

import { NextRequest, NextResponse } from "next/server";
import { MeetingApprovalRule } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { requireInitiativeAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent } from "@/lib/audit/audit-log";
import {
  resolveMeetingPersonSnapshot,
  resolvePersonIdForUser,
} from "@/lib/meetings/meeting-person-payload";
import { recordInitiativeApprovalVote } from "@/lib/club-development/initiative-approval-service";
import {
  canConfigureInitiativeApproval,
  parseApproverPersonIds,
  validateApprovalConfig,
} from "@/lib/club-development/initiative-approval-presentation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([PERMISSIONS.INITIATIVES_MANAGE]);
  if (!access.ok) return access.response;
  const { actor, tenantId } = access.context;
  const { id } = await params;

  const guard = await requireInitiativeAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;

  const existing = await prisma.initiative.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      approvalRequired: true,
      approvalRule: true,
      approverPersonIds: true,
      approvalStatus: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Initiative nicht gefunden." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  if (body?.submitForApproval === true) {
    if (!existing.approvalRequired) {
      return NextResponse.json({ error: "Freigabe ist nicht aktiviert." }, { status: 422 });
    }
    const pool = parseApproverPersonIds(existing.approverPersonIds);
    const validation = validateApprovalConfig({ approvalRequired: true, approverPersonIds: pool });
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 400 });
    }
    await prisma.initiativeApprovalVote.deleteMany({ where: { initiativeId: id } });
    const updated = await prisma.initiative.update({
      where: { id },
      data: { approvalStatus: "PENDING" },
      select: {
        id: true,
        approvalRequired: true,
        approvalRule: true,
        approverPersonIds: true,
        approvalStatus: true,
      },
    });
    void logAuditEvent({
      actorUserId: actor.userId,
      module: "initiatives",
      entityId: id,
      action: "UPDATE",
      after: updated,
    });
    return NextResponse.json({ initiative: updated });
  }

  if (
    !canConfigureInitiativeApproval({
      approvalStatus: existing.approvalStatus,
    })
  ) {
    return NextResponse.json({ error: "Freigabe-Konfiguration ist nach Einreichung gesperrt." }, { status: 403 });
  }

  const approvalRequired =
    typeof body?.approvalRequired === "boolean" ? body.approvalRequired : undefined;
  const ruleRaw = body?.approvalRule as MeetingApprovalRule | undefined;
  const validRules = Object.values(MeetingApprovalRule);

  let approverPersonIds: string[] | undefined;
  if (Array.isArray(body?.approverPersonIds)) {
    const validated: string[] = [];
    const seen = new Set<string>();
    for (const rawId of body.approverPersonIds) {
      if (typeof rawId !== "string" || !rawId.trim()) continue;
      const snap = await resolveMeetingPersonSnapshot(tenantId, rawId.trim());
      if (!snap) {
        return NextResponse.json({ error: "Ungültige Person in Prüferliste." }, { status: 400 });
      }
      if (seen.has(snap.personId)) continue;
      seen.add(snap.personId);
      validated.push(snap.personId);
    }
    approverPersonIds = validated;
  }

  const nextRequired = approvalRequired ?? existing.approvalRequired;
  const nextApprovers =
    approverPersonIds ?? parseApproverPersonIds(existing.approverPersonIds);
  const validation = validateApprovalConfig({
    approvalRequired: nextRequired,
    approverPersonIds: nextApprovers,
  });
  if (validation) {
    return NextResponse.json({ error: validation }, { status: 400 });
  }

  const updated = await prisma.initiative.update({
    where: { id },
    data: {
      approvalRequired,
      approvalRule: ruleRaw && validRules.includes(ruleRaw) ? ruleRaw : undefined,
      approverPersonIds: approverPersonIds ?? undefined,
      approvalStatus: approvalRequired === false ? "NOT_REQUIRED" : undefined,
    },
    select: {
      id: true,
      approvalRequired: true,
      approvalRule: true,
      approverPersonIds: true,
      approvalStatus: true,
    },
  });

  if (approvalRequired === false) {
    await prisma.initiativeApprovalVote.deleteMany({ where: { initiativeId: id } });
  }

  void logAuditEvent({
    actorUserId: actor.userId,
    module: "initiatives",
    entityId: id,
    action: "UPDATE",
    after: updated,
  });

  return NextResponse.json({ initiative: updated });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const { actor, tenantId } = access.context;
  const { id } = await params;

  const guard = await requireInitiativeAccess({ actor, id, access: "read" });
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const approverPersonId = typeof body?.approverPersonId === "string" ? body.approverPersonId.trim() : "";
  const decision = body?.decision;
  const validDecisions = ["APPROVED", "REJECTED", "CHANGES_REQUESTED"] as const;
  if (!approverPersonId || !validDecisions.includes(decision)) {
    return NextResponse.json({ error: "Ungültige Freigabe-Anfrage." }, { status: 400 });
  }

  try {
    const result = await recordInitiativeApprovalVote({
      tenantId,
      initiativeId: id,
      approverPersonId,
      actorUserId: actor.userId,
      actorPersonId: await resolvePersonIdForUser(tenantId, actor.userId),
      decision,
      comment: body?.comment,
      clientRequestId: body?.clientRequestId,
    });

    void logAuditEvent({
      actorUserId: actor.userId,
      module: "initiatives",
      entityId: id,
      action: "UPDATE",
      metadata: { approverPersonId, aggregateStatus: result.aggregateStatus },
    });

    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = ["NOT_AUTHORIZED_APPROVER", "APPROVER_IDENTITY_MISMATCH"].includes(code) ? 403 : 422;
    const messages: Record<string, string> = {
      APPROVAL_NOT_REQUIRED: "Für diese Initiative ist keine Freigabe konfiguriert.",
      NOT_AUTHORIZED_APPROVER: "Keine Berechtigung für diese Freigabe.",
      APPROVER_IDENTITY_MISMATCH: "Freigabe nur im eigenen Namen möglich.",
      NOT_AWAITING_APPROVAL: "Initiative wartet nicht auf Freigabe.",
    };
    return NextResponse.json({ error: messages[code] ?? "Freigabe fehlgeschlagen." }, { status });
  }
}
