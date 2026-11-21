import { formatVereinsentwicklungTaskStatusLabel } from "@/lib/club-development/vereinsentwicklung-task-status-labels";
import type { SprintBoardCard } from "./sprints/sprint-board";
import type { SprintPlanningTaskDto } from "./sprints/sprint-planning-types";
import type { VorhabenWorkspaceTaskRow } from "./vorhaben-workspace";
import {
  buildStrategyWorkspaceHref,
  buildTargetDetailHref,
  type VereinsentwicklungConnectedTaskTableRowModel,
} from "./vereinsentwicklung-connected-task-table";

export function mapVorhabenTaskRowToTableModel(row: VorhabenWorkspaceTaskRow): VereinsentwicklungConnectedTaskTableRowModel {
  return {
    taskId: row.id,
    publicReference: row.publicReference,
    title: row.title,
    taskHref: row.href,
    targetId: row.targetId,
    targetTitle: row.targetTitle,
    targetHref: row.targetId ? buildTargetDetailHref(row.targetId) : null,
    strategyId: row.strategyId,
    strategyTitle: row.strategyTitle,
    strategyHref: row.strategyId ? buildStrategyWorkspaceHref(row.strategyId) : null,
    orgUnitLabel: row.orgUnitLabel,
    status: row.status,
    statusLabel: row.statusLabel,
    assignees: row.assigneeLabels.map((displayName, index) => ({
      userId: `${row.id}-assignee-${index}`,
      displayName,
      imageUrl: null,
    })),
  };
}

export function mapSprintBoardCardToTableModel(card: SprintBoardCard): VereinsentwicklungConnectedTaskTableRowModel {
  return {
    taskId: card.taskId,
    publicReference: card.publicReference ?? null,
    title: card.title,
    taskHref: card.taskHref,
    targetId: card.targetId,
    targetTitle: card.targetTitle,
    targetHref: card.targetId ? buildTargetDetailHref(card.targetId) : null,
    strategyId: card.strategyId,
    strategyTitle: card.strategyTitle,
    strategyHref: card.strategyId ? buildStrategyWorkspaceHref(card.strategyId) : null,
    orgUnitLabel: card.orgUnitLabel,
    status: card.status,
    statusLabel: formatVereinsentwicklungTaskStatusLabel(card.status),
    assignees: card.assignees,
  };
}

export function mapPlanningTaskToTableModel(task: SprintPlanningTaskDto): VereinsentwicklungConnectedTaskTableRowModel {
  return {
    taskId: task.id,
    publicReference: task.publicReference,
    title: task.title,
    taskHref: task.taskHref,
    targetId: task.targetId,
    targetTitle: task.targetTitle,
    targetHref: task.targetId ? buildTargetDetailHref(task.targetId) : null,
    strategyId: task.strategyId,
    strategyTitle: task.strategyTitle,
    strategyHref: task.strategyId ? buildStrategyWorkspaceHref(task.strategyId) : null,
    orgUnitLabel: task.orgUnitLabel,
    status: task.status,
    statusLabel: task.statusLabel,
    assignees: task.assignees,
  };
}