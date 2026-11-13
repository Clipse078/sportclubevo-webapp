import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { prisma } from "@/lib/db/prisma";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { loadMeetingPendenzenSnapshot } from "@/lib/meetings/load-meeting-pendenzen";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: meetingId } = await params;
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const tenantId = actor.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant fehlt" }, { status: 400 });
  }

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, tenantId },
    select: { id: true, title: true, slug: true, meetingDate: true },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const taskCtx = await getTaskServiceContext();
  const snapshot = await loadMeetingPendenzenSnapshot({ meeting, taskCtx });

  return NextResponse.json({
    items: snapshot.items.map((row) => ({
      ...row,
      meetingDate: row.meetingDate.toISOString(),
      deadline: row.deadline?.toISOString() ?? null,
    })),
    openCount: snapshot.openCount,
    overdueCount: snapshot.overdueCount,
  });
}
