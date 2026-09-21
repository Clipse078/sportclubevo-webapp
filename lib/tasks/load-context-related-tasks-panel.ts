import type { TaskContextType } from "@prisma/client";
import {
  DEFAULT_ENTITY_RELATED_TASK_LIMIT,
  DEFAULT_ENTITY_RELATED_TASK_ROOTS_ONLY,
  DEFAULT_ENTITY_RELATED_TASK_STATUSES,
} from "./context-related-defaults";
import type { ContextRelatedTaskSummaryDto } from "./context-related-task-types";
import { countTasksForContext } from "./count-tasks-for-context";
import { listTasksForContext } from "./list-tasks-for-context";
import { resolveContextualTaskCreateEligibility } from "./contextual-task-eligibility";
import type { TaskServiceContext } from "./types";

export type ContextRelatedTasksPanelDto = {
  actionableCount: number;
  tasks: ContextRelatedTaskSummaryDto[];
  hasMore: boolean;
  canCreate: boolean;
  canViewRelatedTasks: boolean;
};

export type LoadContextRelatedTasksPanelOptions = {
  limit?: number;
  rootsOnly?: boolean;
  statuses?: typeof DEFAULT_ENTITY_RELATED_TASK_STATUSES;
};

export async function loadContextRelatedTasksPanel(
  ctx: TaskServiceContext,
  contextType: TaskContextType,
  contextId: string,
  options?: LoadContextRelatedTasksPanelOptions,
): Promise<ContextRelatedTasksPanelDto | null> {
  const eligibility = await resolveContextualTaskCreateEligibility(ctx, contextType, contextId);
  if (!eligibility.canViewRelatedTasks) {
    return null;
  }

  const rootsOnly = options?.rootsOnly ?? DEFAULT_ENTITY_RELATED_TASK_ROOTS_ONLY;
  const statuses = options?.statuses ?? DEFAULT_ENTITY_RELATED_TASK_STATUSES;
  const limit = options?.limit ?? DEFAULT_ENTITY_RELATED_TASK_LIMIT;

  const queryOptions = { rootsOnly, statuses, limit };

  const [actionableCount, page] = await Promise.all([
    countTasksForContext(ctx, contextType, contextId, { rootsOnly, statuses }),
    listTasksForContext(ctx, contextType, contextId, queryOptions),
  ]);

  return {
    actionableCount,
    tasks: page.tasks,
    hasMore: page.hasMore,
    canCreate: eligibility.canCreate,
    canViewRelatedTasks: true,
  };
}
