import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import { MeetingAgendaItemStatus } from "@prisma/client";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent } from "@/lib/audit/audit-log";
import { normalizeAgendaDurationMin } from "@/lib/meetings/agenda-duration";
import { resolveMeetingAgendaInitiativeLink } from "@/lib/meetings/meeting-initiative-link";
import { resolveMeetingPersonSnapshot } from "@/lib/meetings/meeting-person-payload";

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

  const items = await prisma.meetingAgendaItem.findMany({
    where: { meetingId: id },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      notes: true,
      owner: true,
      ownerPersonId: true,
      durationMin: true,
      initiativeId: true,
      orderIndex: true,
      status: true,
      sourceAgendaItemId: true,
      initiative: { select: { id: true, slug: true, title: true, status: true } },
    },
  });
  return NextResponse.json({ items });
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

  const validStatuses = Object.values(MeetingAgendaItemStatus);
  const status: MeetingAgendaItemStatus = validStatuses.includes(body?.status)
    ? body.status : MeetingAgendaItemStatus.OPEN;

  let owner = body?.owner?.trim() || null;
  let ownerPersonId: string | null = body?.ownerPersonId?.trim() || null;
  if (ownerPersonId && actor.tenantId) {
    const snap = await resolveMeetingPersonSnapshot(actor.tenantId, ownerPersonId);
    if (!snap) return NextResponse.json({ error: "Person nicht gefunden." }, { status: 400 });
    owner = snap.displayName;
    ownerPersonId = snap.personId;
  }

  let initiativeId: string | null = null;
  try {
    const link = await resolveMeetingAgendaInitiativeLink(actor, body?.initiativeId);
    initiativeId = link.initiativeId;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ungültiges Vorhaben." }, { status: 400 });
  }

  const sourceAgendaItemId =
    typeof body?.sourceAgendaItemId === "string" ? body.sourceAgendaItemId.trim() || null : null;

  try {
    const item = await prisma.meetingAgendaItem.create({
      data: {
        meetingId: id,
        title,
        notes: body?.notes?.trim() || null,
        owner,
        ownerPersonId,
        durationMin: normalizeAgendaDurationMin(body?.durationMin),
        initiativeId,
        sourceAgendaItemId,
        orderIndex: body?.orderIndex ?? 0,
        status,
        createdByUserId: actor.userId,
      },
      select: { id: true, title: true, status: true },
    });
    void logAuditEvent({ actorUserId: actor.userId, module: "meetings", entityId: id, action: "AGENDA_CREATE", after: { itemId: item.id, title: item.title } });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Traktandum konnte nicht erstellt werden." }, { status: 500 });
  }
}
