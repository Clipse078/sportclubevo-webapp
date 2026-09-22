import type {
  TaskContextType,
  TaskPriority,
  TaskStatus,
  TaskVisibilityScope,
} from "@prisma/client";

export type TaskAuthScope = {
  memberOrgUnitIds: readonly string[];
  permissionReadOrgUnitIds: readonly string[];
  permissionManageOrgUnitIds: readonly string[];
};

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
  reminder1At: string | null;
  reminder2At: string | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  completedAt: string | null;
  contextType: TaskContextType | null;
  contextId: string | null;
  parentTaskId: string | null;
  taskSeriesId: string | null;
  orgUnitId: string | null;
  visibilityScope: TaskVisibilityScope;
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

export type TaskReminderMutationInput = {
  reminder1At?: Date | null;
  reminder2At?: Date | null;
  reminder1PresetKey?: string | null;
  reminder2PresetKey?: string | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: Date | null;
} & TaskReminderMutationInput & {
  contextType?: TaskContextType | null;
  contextId?: string | null;
  assigneeUserIds?: string[];
  orgUnitId?: string | null;
  orgUnitGrantIds?: string[];
  viewerUserGrantIds?: string[];
  visibilityScope?: TaskVisibilityScope;
};

/** AUFGABEN-06P — compact Meine Aufgaben creation (canonical Task, CLUB visibility default). */
export type CreateQuickTaskInput = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: Date | null;
  assigneeUserIds: string[];
} & TaskReminderMutationInput;

export type CreateSubtaskInput = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: Date | null;
  assigneeUserIds?: string[];
} & TaskReminderMutationInput;

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: Date | null;
  status?: TaskStatus;
} & TaskReminderMutationInput & {
  contextType?: TaskContextType | null;
  contextId?: string | null;
  orgUnitId?: string | null;
  orgUnitGrantIds?: string[];
  viewerUserGrantIds?: string[];
  visibilityScope?: TaskVisibilityScope;
};

export type ListTasksFilter = {
  status?: TaskStatus | TaskStatus[];
  openOnly?: boolean;
  /** When true, only root tasks (no parentTaskId). */
  rootsOnly?: boolean;
  /** Max rows after personal ordering (dashboard preview, etc.). */
  limit?: number;
};

export type TaskServiceContext = {
  tenantId: string;
  userId: string;
  permissionKeys: readonly string[];
  /** Hydrated by getTaskServiceContext; optional in unit tests. */
  auth?: TaskAuthScope;
};
