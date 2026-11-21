import type { TaskStatus } from "@prisma/client";
import type { SprintTaskAssigneeViewModel } from "./sprint-task-assignee";

export type SprintPlanningTaskDto = {
  id: string;
  publicReference: string | null;
  title: string;
  status: TaskStatus;
  statusLabel: string;
  assignees: SprintTaskAssigneeViewModel[];
  /** @deprecated use assignees */
  assigneeLabels: string[];
  dueAt: string | null;
  selectable: boolean;
  inTargetSprint: boolean;
  otherSprintTitle: string | null;
  exclusionReason: string | null;
  targetId: string | null;
  targetTitle: string | null;
  strategyId: string | null;
  strategyTitle: string | null;
  orgUnitLabel: string | null;
  taskHref: string;
  /** Present on Ungeplant catalog rows — persisted backlog rank when set. */
  unplannedRank?: number | null;
  progressHasChildRollup?: boolean;
  progressCompletedCount?: number | null;
  progressTotalCount?: number | null;
};

export type SprintPlanningDeliveryAggregate = {
  completedCount: number;
  totalCount: number;
};

export type SprintPlanningInitiativeGroupDto = {
  initiativeId: string;
  title: string;
  slug: string;
  tasks: SprintPlanningTaskDto[];
};

export type SprintPlanningCatalogDto = {
  initiativeGroups: SprintPlanningInitiativeGroupDto[];
  standaloneGroup: { tasks: SprintPlanningTaskDto[] };
  /** Eligible leaf rollup across selectable catalog tasks (Ungeplant header). */
  aggregateDeliveryProgress?: SprintPlanningDeliveryAggregate;
};