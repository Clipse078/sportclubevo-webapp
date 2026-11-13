/**
 * SCE-MTG-PEND-01 — canonical permission-filtered Pendenzen load (API + SSR).
 */

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { listTasksForContext } from "@/lib/tasks/list-tasks-for-context";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { MEETING_ACTION_STATUS_LABEL } from "@/lib/meetings/meeting-protocol-labels";
import { resolveStoredPersonDisplayName } from "@/lib/meetings/meeting-person-display";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";
import {
  PENDENZ_TASK_LIST_OPTIONS,
  countOpenPendenzen,
  countOverduePendenzen,
  mergeMeetingPendenzen,
  type PendenzListItem,
} from "@/lib/meetings/meeting-pendenzen";

export type MeetingPendenzenSnapshot = {
  items: PendenzListItem[];
  openCount: number;
  overdueCount: number;
};

export async function loadMeetingPendenzenSnapshot(input: {
  meeting: { id: string; title: string; slug: string; meetingDate: Date };
  taskCtx: TaskServiceContext | null;
}): Promise<MeetingPendenzenSnapshot> {
  const actions = await prisma.meetingAction.findMany({
    where: { meetingId: input.meeting.id },
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

  if (input.taskCtx) {
    const page = await listTasksForContext(
      input.taskCtx,
      TaskContextType.MEETING,
      input.meeting.id,
      PENDENZ_TASK_LIST_OPTIONS,
    );
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
    meeting: input.meeting,
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

  return {
    items: merged,
    openCount: countOpenPendenzen(merged),
    overdueCount: countOverduePendenzen(merged),
  };
}
