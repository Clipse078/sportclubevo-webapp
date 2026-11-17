import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { createMeetingTraktandumTask } from "@/lib/meetings/meeting-traktandum-tasks";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

async function requireSession() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const, session };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const check = await requireSession();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id: meetingId, itemId: agendaItemId } = await params;
  const actor = await getActorContext(check.session.user, check.session.user?.activeTenantId ?? undefined);
  const body = await req.json().catch(() => ({}));

  try {
    const result = await createMeetingTraktandumTask(actor, meetingId, agendaItemId, {
      title: String(body?.title ?? ""),
      description: body?.description ?? null,
      dueAt: body?.dueAt ?? null,
      priority: body?.priority,
      orgUnitId: body?.orgUnitId ?? null,
      assigneeUserIds: Array.isArray(body?.assigneeUserIds)
        ? body.assigneeUserIds.map(String)
        : [],
      idempotencyKey: body?.idempotencyKey ?? null,
      clientRequestId: body?.clientRequestId ?? null,
    });
    return NextResponse.json(result, { status: result.deduplicated ? 200 : 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Aufgabe konnte nicht erstellt werden.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}