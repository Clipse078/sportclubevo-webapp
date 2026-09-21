import type { TaskContextType, TaskPriority, TaskStatus } from "@prisma/client";

export type ContextRelatedTaskAssigneeSummary = {
  userId: string;
  firstName: string;
  lastName: string;
};

/** Compact summary for future contextual entity panels (06F). */
export type ContextRelatedTaskSummaryDto = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  assignees: ContextRelatedTaskAssigneeSummary[];
  parentTaskId: string | null;
};

export type ListTasksForContextOptions = {
  /** When true, only root tasks (no parentTaskId). */
  rootsOnly?: boolean;
  limit?: number;
  cursor?: string | null;
};

export type ListTasksForContextPageDto = {
  tasks: ContextRelatedTaskSummaryDto[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ListTasksForContextParams = {
  contextType: TaskContextType;
  contextId: string;
  options?: ListTasksForContextOptions;
};
