import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import { MeetingDecisionStatus } from "@prisma/client";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent } from "@/lib/audit/audit-log";
import { resolveMeetingPersonSnapshot } from "@/lib/meetings/meeting-person-payload";
import { resolveMeetingDecisionAgendaLink } from "@/lib/meetings/meeting-decision-agenda-link";
import { parseOptionalMeetingDocumentationText } from "@/lib/meetings/meeting-documentation-text";

async function requireSession() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const, session };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const check = await requireSession();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id } = await params;
  const actor = await getActorContext(check.session.user, check.session.user?.activeTenantId ?? undefined);
  const guard = await requireMeetingAccess({ actor, id, access: "read" });
  if (!guard.ok) return guard.response;
  const decisions = await prisma.meetingDecision.findMany({
    where: { meetingId: id },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      rationale: true,
      status: true,
      owner: true,
      ownerPersonId: true,
      orderIndex: true,
      sourceAgendaItemId: true,
      sourceAgendaItem: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json({ decisions });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const check = await requireSession();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id } = await params;
  const actor = await getActorContext(check.session.user, check.session.user?.activeTenantId ?? undefined);
  const guard = await requireMeetingAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => ({}));
  const title = (body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  const validStatuses = Object.values(MeetingDecisionStatus);
  const status: MeetingDecisionStatus = validStatuses.includes(body?.status) ? body.status : MeetingDecisionStatus.CONFIRMED;
  let owner = body?.owner?.trim() || null;
  let ownerPersonId: string | null = body?.ownerPersonId?.trim() || null;
  if (ownerPersonId && actor.tenantId) {
    const snap = await resolveMeetingPersonSnapshot(actor.tenantId, ownerPersonId);
    if (!snap) return NextResponse.json({ error: "Person nicht gefunden." }, { status: 400 });
    owner = snap.displayName;
    ownerPersonId = snap.personId;
  }

  let sourceAgendaItemId: string | null = null;
  try {
    sourceAgendaItemId = await resolveMeetingDecisionAgendaLink(
      actor,
      id,
      body?.sourceAgendaItemId,
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ungültiges Traktandum." },
      { status: 400 },
    );
  }

  const parsedDescription = parseOptionalMeetingDocumentationText(body?.description);
  if (!parsedDescription.ok) {
    return NextResponse.json({ error: parsedDescription.error }, { status: 400 });
  }
  const parsedRationale = parseOptionalMeetingDocumentationText(body?.rationale);
  if (!parsedRationale.ok) {
    return NextResponse.json({ error: parsedRationale.error }, { status: 400 });
  }

  try {
    const decision = await prisma.meetingDecision.create({
      data: {
        meetingId: id,
        title,
        description: body?.description !== undefined ? parsedDescription.value : null,
        rationale: body?.rationale !== undefined ? parsedRationale.value : null,
        status,
        owner,
        ownerPersonId,
        orderIndex: body?.orderIndex ?? 0,
        sourceAgendaItemId,
        createdByUserId: actor.userId,
      },
      select: { id: true, title: true, status: true },
    });
    void logAuditEvent({ actorUserId: actor.userId, module: "meetings", entityId: id, action: "DECISION_CREATE", after: { decisionId: decision.id, title: decision.title } });
    return NextResponse.json({ decision }, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Beschluss konnte nicht erstellt werden." }, { status: 500 }); }
}
