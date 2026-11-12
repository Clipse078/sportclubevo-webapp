import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import {
  applyCarryForwardSelections,
  listCarryForwardEligibleItems,
  type CarryForwardSourceType,
} from "@/lib/meetings/meeting-carry-forward";

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

  const items = await listCarryForwardEligibleItems(actor, id);
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
  const raw = Array.isArray(body?.selections) ? body.selections : [];
  const selections = raw
    .map((row: Record<string, unknown>) => {
      const sourceType = row?.sourceType as CarryForwardSourceType;
      if (sourceType !== "AGENDA_OPEN" && sourceType !== "TASK_OPEN") return null;
      return {
        sourceType,
        sourceAgendaItemId:
          typeof row?.sourceAgendaItemId === "string" ? row.sourceAgendaItemId.trim() : undefined,
        sourceTaskId: typeof row?.sourceTaskId === "string" ? row.sourceTaskId.trim() : undefined,
      };
    })
    .filter(Boolean);

  if (selections.length === 0) {
    return NextResponse.json({ error: "Keine gültige Auswahl." }, { status: 400 });
  }

  try {
    const result = await applyCarryForwardSelections({
      actor,
      targetMeetingId: id,
      selections,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Übernahme fehlgeschlagen." }, { status: 500 });
  }
}
