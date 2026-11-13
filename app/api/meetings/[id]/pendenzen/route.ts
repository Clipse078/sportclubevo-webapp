import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { TaskContextType } from "@prisma/client";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { prisma } from "@/lib/db/prisma";
import { listTasksForContext } from "@/lib/tasks/list-tasks-for-context";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { MEETING_ACTION_STATUS_LABEL } from "@/lib/meetings/meeting-protocol-labels";
import { resolveStoredPersonDisplayName } from "@/lib/meetings/meeting-person-display";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";
import { mergeMeetingPendenzen, countOpenPendenzen } from "@/lib/meetings/meeting-pendenzen";

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

  const actions = await prisma.meetingAction.findMany({
    where: { meetingId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      expectedOutcome: true,
      owner: true,
      ownerPersonId: true,
      dueDate: true,
      status: true,
    },
  });

  const taskCtx = await getTaskServiceContext();
  const tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    dueAt: Date | null;
    status: import("@prisma/client").TaskStatus;
    statusLabel: string;
    assigneeLabels: string[];
    contextReference: string | null;
  }> = [];

  if (taskCtx) {
    const page = await listTasksForContext(taskCtx, TaskContextType.MEETING, meetingId, { limit: 100 });
    for (const task of page.tasks) {
      tasks.push({
        id: task.id,
        title: task.title,
        description: null,
        dueAt: task.dueAt ? new Date(task.dueAt) : null,
        status: task.status,
        statusLabel: TASK_STATUS_LABELS[task.status],
        assigneeLabels: task.assignees.map((a) => `${a.firstName} ${a.lastName}`.trim()).filter(Boolean),
        contextReference: null,
      });
    }
  }

  const merged = mergeMeetingPendenzen({
    meeting,
    actions: actions.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      expectedOutcome: a.expectedOutcome,
      owner: resolveStoredPersonDisplayName({ name: a.owner, personId: a.ownerPersonId }),
      dueDate: a.dueDate,
      status: a.status,
      statusLabel: MEETING_ACTION_STATUS_LABEL[a.status],
    })),
    tasks,
  });

  return NextResponse.json({
    items: merged.map((row) => ({
      ...row,
      meetingDate: row.meetingDate.toISOString(),
      deadline: row.deadline?.toISOString() ?? null,
    })),
    openCount: countOpenPendenzen(merged),
  });
}
