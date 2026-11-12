/**
 * PATCH — Beschluss approval config; POST — approver vote (SCE-CD-02R9).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { MeetingApprovalRule } from "@prisma/client";
import { auth } from "@/auth";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent } from "@/lib/audit/audit-log";
import { recordDecisionApprovalVote } from "@/lib/meetings/meeting-decision-approval-service";
import {
  resolveMeetingPersonSnapshot,
  resolvePersonIdForUser,
} from "@/lib/meetings/meeting-person-payload";
import {
  canConfigureDecisionApproval,
  parseApproverPersonIds,
  validateApprovalConfig,
} from "@/lib/meetings/meeting-approval-presentation";

type RouteContext = { params: Promise<{ id: string; decisionId: string }> };

async function requireSession() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const, session };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const check = await requireSession();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id, decisionId } = await params;
  const actor = await getActorContext(check.session.user, check.session.user?.activeTenantId ?? undefined);
  const guard = await requireMeetingAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;

  const existing = await prisma.meetingDecision.findFirst({
    where: { id: decisionId, meetingId: id },
    select: {
      id: true,
      approvalRequired: true,
      approvalRule: true,
      approverPersonIds: true,
      approvalStatus: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "Beschluss nicht gefunden." }, { status: 404 });

  const meeting = await prisma.meeting.findFirst({
    where: { id, tenantId: actor.tenantId },
    select: { status: true },
  });
  if (!meeting) return NextResponse.json({ error: "Sitzung nicht gefunden." }, { status: 404 });

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
  }

  const submitForApproval = body?.submitForApproval === true;

  if (!submitForApproval) {
    const allowed = canConfigureDecisionApproval({
      meetingStatus: meeting.status,
      approvalStatus: existing.approvalStatus,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Freigabe-Konfiguration ist nach Einreichung gesperrt." },
        { status: 403 },
      );
    }
  }

  if (submitForApproval) {
    await prisma.meetingDecisionApprovalVote.deleteMany({ where: { decisionId } });
    const updated = await prisma.meetingDecision.update({
      where: { id: decisionId },
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
      module: "meetings",
      entityId: id,
      action: "DECISION_APPROVAL_SUBMIT",
      after: { decisionId, ...updated },
    });
    return NextResponse.json({ decision: updated });
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
      const snap = await resolveMeetingPersonSnapshot(actor.tenantId!, rawId.trim());
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

  const updated = await prisma.meetingDecision.update({
    where: { id: decisionId },
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
    await prisma.meetingDecisionApprovalVote.deleteMany({ where: { decisionId } });
  }

  void logAuditEvent({
    actorUserId: actor.userId,
    module: "meetings",
    entityId: id,
    action: "DECISION_APPROVAL_CONFIG",
    after: { decisionId, ...updated },
  });

  return NextResponse.json({ decision: updated });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const check = await requireSession();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id, decisionId } = await params;
  const actor = await getActorContext(check.session.user, check.session.user?.activeTenantId ?? undefined);
  const guard = await requireMeetingAccess({ actor, id, access: "read" });
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const approverPersonId = typeof body?.approverPersonId === "string" ? body.approverPersonId.trim() : "";
  const decision = body?.decision;
  const validDecisions = ["APPROVED", "REJECTED", "CHANGES_REQUESTED"] as const;
  if (!approverPersonId || !validDecisions.includes(decision)) {
    return NextResponse.json({ error: "Ungültige Freigabe-Anfrage." }, { status: 400 });
  }

  try {
    const result = await recordDecisionApprovalVote({
      tenantId: actor.tenantId!,
      decisionId,
      meetingId: id,
      approverPersonId,
      actorUserId: actor.userId,
      actorPersonId: await resolvePersonIdForUser(actor.tenantId!, actor.userId),
      decision,
      comment: body?.comment,
      clientRequestId: body?.clientRequestId,
    });

    void logAuditEvent({
      actorUserId: actor.userId,
      module: "meetings",
      entityId: id,
      action: "DECISION_APPROVAL_VOTE",
      metadata: { decisionId, approverPersonId, aggregateStatus: result.aggregateStatus },
    });

    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = ["NOT_AUTHORIZED_APPROVER", "APPROVER_IDENTITY_MISMATCH"].includes(code) ? 403 : 422;
    const messages: Record<string, string> = {
      APPROVAL_NOT_REQUIRED: "Für diesen Beschluss ist keine Freigabe konfiguriert.",
      NOT_AUTHORIZED_APPROVER: "Keine Berechtigung für diese Freigabe.",
      APPROVER_IDENTITY_MISMATCH: "Freigabe nur im eigenen Namen möglich.",
      NOT_AWAITING_APPROVAL: "Beschluss wartet nicht auf Freigabe.",
    };
    return NextResponse.json({ error: messages[code] ?? "Freigabe fehlgeschlagen." }, { status });
  }
}
