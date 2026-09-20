/**
 * Maps canonical Task DTOs to the shared Inbox presentation types.
 * Dependency direction: Task domain → Inbox adapter (not the reverse).
 */

import type { InboxItemBase, InboxOwner } from "@/lib/inbox/types";
import type { TaskDto } from "./types";

export type TaskInboxItem = InboxItemBase & {
  title: string;
  priority: string;
  dueAt: string | null;
  assignees: InboxOwner[];
};

export function taskToInboxItem(task: TaskDto): TaskInboxItem {
  return {
    id: task.id,
    status: task.status,
    submittedAt: task.createdAt,
    updatedAt: task.updatedAt,
    title: task.title,
    priority: task.priority,
    dueAt: task.dueAt,
    assignees: task.assignees.map((a) => ({
      id: a.userId,
      firstName: a.firstName,
      lastName: a.lastName,
    })),
  };
}
