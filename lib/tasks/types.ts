import type { TaskContextType, TaskPriority, TaskStatus } from "@prisma/client";

export type TaskAssigneeDto = {
  userId: string;
  firstName: string;
  lastName: string;
  assignedAt: string;
};

export type TaskParentSummaryDto = {
  id: string;
  title: string;
};

export type TaskDto = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  completedAt: string | null;
  contextType: TaskContextType | null;
  contextId: string | null;
  parentTaskId: string | null;
  taskSeriesId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: TaskAssigneeDto[];
};

export type PersonalTaskDto = TaskDto & {
  parentTask: TaskParentSummaryDto | null;
};

export type TaskProgressDto = {
  completedCount: number;
  totalCount: number;
  percent: number;
  label: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: Date | null;
  contextType?: TaskContextType | null;
  contextId?: string | null;
  assigneeUserIds?: string[];
};

export type CreateSubtaskInput = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: Date | null;
  assigneeUserIds?: string[];
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: Date | null;
  status?: TaskStatus;
};

export type ListTasksFilter = {
  status?: TaskStatus | TaskStatus[];
  openOnly?: boolean;
  /** When true, only root tasks (no parentTaskId). */
  rootsOnly?: boolean;
};

export type TaskServiceContext = {
  tenantId: string;
  userId: string;
  permissionKeys: readonly string[];
};
