import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  createMeetingDecisionTask,
  linkExistingTaskToMeetingDecision,
  listMeetingDecisionTasks,
} from "@/lib/meetings/meeting-decision-tasks";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { prisma } from "@/lib/db/prisma";
import { buildTaskVisibilityWhere } from "@/lib/tasks/visibility";
import { TaskContextType } from "@prisma/client";

async function requireSession() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const, session };
}

type RouteContext = { params: Promise<{ id: string; decisionId: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const check = await requireSession();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id, decisionId } = await params;
  const actor = await getActorContext(check.session.user, check.session.user?.activeTenantId ?? undefined);

  const tasks = await listMeetingDecisionTasks(actor, id, decisionId);

  const q = req.nextUrl.searchParams.get("q")?.trim();
  let linkable: { id: string; title: string }[] | undefined;
  if (q && q.length >= 2) {
    const ctx = await getTaskServiceContext();
    if (ctx) {
      const rows = await prisma.task.findMany({
        where: {
          AND: [
            buildTaskVisibilityWhere(ctx),
            { parentTaskId: null },
            {
              OR: [
                { contextType: null, contextId: null },
                { contextType: TaskContextType.MEETING, contextId: id },
              ],
            },
            { title: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true },
      });
      linkable = rows.map((r) => ({ id: r.id, title: r.title }));
    }
  }

  return NextResponse.json({ tasks, linkable });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const check = await requireSession();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id, decisionId } = await params;
  const actor = await getActorContext(check.session.user, check.session.user?.activeTenantId ?? undefined);
  const body = await req.json().catch(() => ({}));

  try {
    if (body?.mode === "link" && body?.taskId) {
      const result = await linkExistingTaskToMeetingDecision(
        actor,
        id,
        decisionId,
        String(body.taskId),
      );
      return NextResponse.json(result, { status: 200 });
    }

    const result = await createMeetingDecisionTask(actor, id, decisionId, {
      title: String(body?.title ?? ""),
      description: body?.description ?? null,
      dueAt: body?.dueAt ?? null,
      priority: body?.priority,
      orgUnitId: body?.orgUnitId ?? null,
      assigneeUserIds: Array.isArray(body?.assigneeUserIds)
        ? body.assigneeUserIds.map(String)
        : [],
      idempotencyKey: body?.idempotencyKey ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Aufgabe konnte nicht erstellt werden.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
