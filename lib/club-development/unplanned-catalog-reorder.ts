import type { SprintPlanningCatalogDto, SprintPlanningTaskDto } from "./sprints/sprint-planning-types";

function remapTasks(
  tasks: SprintPlanningTaskDto[],
  rankById: Map<string, number>,
): SprintPlanningTaskDto[] {
  return tasks.map((task) => ({
    ...task,
    unplannedRank: rankById.get(task.id) ?? task.unplannedRank ?? null,
  }));
}

/** Apply a full unplanned task id order to a planning catalog (client optimistic UI). */
export function applyUnplannedOrderToCatalog(
  catalog: SprintPlanningCatalogDto,
  orderedTaskIds: readonly string[],
): SprintPlanningCatalogDto {
  const rankById = new Map(orderedTaskIds.map((id, index) => [id, index + 1]));
  return {
    initiativeGroups: catalog.initiativeGroups.map((group) => ({
      ...group,
      tasks: remapTasks(group.tasks, rankById),
    })),
    standaloneGroup: {
      tasks: remapTasks(catalog.standaloneGroup.tasks, rankById),
    },
  };
}