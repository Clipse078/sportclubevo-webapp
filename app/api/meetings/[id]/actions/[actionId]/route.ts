import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import { MeetingActionStatus } from "@prisma/client";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent } from "@/lib/audit/audit-log";
import { resolveMeetingPersonSnapshot } from "@/lib/meetings/meeting-person-payload";
import { parseOptionalMeetingDocumentationText } from "@/lib/meetings/meeting-documentation-text";

async function requireSession() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const, session };
}

type RouteContext = { params: Promise<{ id: string; actionId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const check = await requireSession();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id, actionId } = await params;
  const actor = await getActorContext(check.session.user, check.session.user?.activeTenantId ?? undefined);
  const guard = await requireMeetingAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;

  const existing = await prisma.meetingAction.findUnique({
    where: { id: actionId, meetingId: id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Massnahme nicht gefunden." }, { status: 404 });

  const meeting = await prisma.meeting.findFirst({
    where: { id, tenantId: actor.tenantId },
    select: { status: true, reviewStage: true, protocolApprovalRequired: true },
  });
  if (meeting) {
    const { canEditMeetingDocumentation } = await import("@/lib/meetings/meeting-workspace-lock");
    if (
      !canEditMeetingDocumentation({
        status: meeting.status,
        reviewStage: meeting.reviewStage,
        protocolApprovalRequired: meeting.protocolApprovalRequired,
      })
    ) {
      return NextResponse.json({ error: "Sitzung ist schreibgeschützt." }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const validStatuses = Object.values(MeetingActionStatus);

  let nextDescription: string | null | undefined = undefined;
  if (body?.description !== undefined) {
    const parsed = parseOptionalMeetingDocumentationText(body.description);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    nextDescription = parsed.value;
  }
  let nextExpectedOutcome: string | null | undefined = undefined;
  if (body?.expectedOutcome !== undefined) {
    const parsed = parseOptionalMeetingDocumentationText(body.expectedOutcome);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    nextExpectedOutcome = parsed.value;
  }

  const patch: Record<string, unknown> = {
    title: body?.title?.trim() || undefined,
    description: nextDescription,
    expectedOutcome: nextExpectedOutcome,
    dueDate: body?.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
    status: validStatuses.includes(body?.status) ? body.status : undefined,
  };

  if (body?.ownerPersonId !== undefined) {
    const pid = body.ownerPersonId?.trim() || null;
    if (!pid) {
      patch.ownerPersonId = null;
      patch.owner = body?.owner?.trim() || null;
    } else if (actor.tenantId) {
      const snap = await resolveMeetingPersonSnapshot(actor.tenantId, pid);
      if (!snap) return NextResponse.json({ error: "Person nicht gefunden." }, { status: 400 });
      patch.ownerPersonId = snap.personId;
      patch.owner = snap.displayName;
    }
  } else if (body?.owner !== undefined) {
    patch.owner = body?.owner?.trim() || null;
  }

  try {
    const updated = await prisma.meetingAction.update({
      where: { id: actionId },
      data: patch,
      select: {
        id: true,
        title: true,
        description: true,
        expectedOutcome: true,
        status: true,
        owner: true,
        ownerPersonId: true,
        dueDate: true,
      },
    });
    void logAuditEvent({
      actorUserId: actor.userId,
      module: "meetings",
      entityId: id,
      action: "ACTION_UPDATE",
      after: { actionId: updated.id, status: updated.status },
    });
    return NextResponse.json({ action: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Massnahme konnte nicht aktualisiert werden." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const check = await requireSession();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id, actionId } = await params;
  const actor = await getActorContext(check.session.user, check.session.user?.activeTenantId ?? undefined);
  const guard = await requireMeetingAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;
  const existing = await prisma.meetingAction.findUnique({ where: { id: actionId, meetingId: id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Massnahme nicht gefunden." }, { status: 404 });
  await prisma.meetingAction.delete({ where: { id: actionId } });
  void logAuditEvent({ actorUserId: actor.userId, module: "meetings", entityId: id, action: "ACTION_DELETE", before: { actionId } });
  return NextResponse.json({ message: "Massnahme gelöscht." });
}
