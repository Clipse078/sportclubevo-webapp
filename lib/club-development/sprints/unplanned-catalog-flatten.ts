import type { SprintPlanningCatalogDto, SprintPlanningTaskDto } from "./sprint-planning-types";

export function flattenUnplannedCatalogTasks(catalog: SprintPlanningCatalogDto): SprintPlanningTaskDto[] {
  const tasks: SprintPlanningTaskDto[] = [];
  for (const group of catalog.initiativeGroups) {
    tasks.push(...group.tasks);
  }
  tasks.push(...catalog.standaloneGroup.tasks);
  return tasks.sort((a, b) => {
    const ra = a.unplannedRank ?? Number.MAX_SAFE_INTEGER;
    const rb = b.unplannedRank ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title, "de");
  });
}