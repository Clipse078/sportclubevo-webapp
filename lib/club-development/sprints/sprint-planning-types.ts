import type { TaskStatus } from "@prisma/client";

export type SprintPlanningTaskDto = {
  id: string;
  title: string;
  status: TaskStatus;
  statusLabel: string;
  assigneeLabels: string[];
  dueAt: string | null;
  selectable: boolean;
  inTargetSprint: boolean;
  otherSprintTitle: string | null;
  exclusionReason: string | null;
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