import type { TaskStatus } from "@prisma/client";
import type { SprintTaskAssigneeViewModel } from "./sprint-task-assignee";

export type SprintPlanningTaskDto = {
  id: string;
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
};