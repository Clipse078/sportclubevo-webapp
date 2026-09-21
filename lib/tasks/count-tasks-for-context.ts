/**
 * AUFGABEN-06F1 — visible related Task count (same security intersection as list).
 */

import type { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertTaskContextEntityReadable } from "./context-entity-read";
import type { ListTasksForContextOptions } from "./context-related-task-types";
import { TaskForbiddenError } from "./errors";
import { buildRelatedTaskWhere } from "./related-task-query";
import { hasTaskPermission } from "./visibility";
import type { TaskServiceContext } from "./types";

function assertCanQueryRelatedTasks(ctx: TaskServiceContext): void {
  if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW)) {
    throw new TaskForbiddenError("Missing tasks.view");
  }
}

export async function countTasksForContext(
  ctx: TaskServiceContext,
  contextType: TaskContextType,
  contextId: string,
  options?: Pick<ListTasksForContextOptions, "rootsOnly" | "statuses">,
): Promise<number> {
  assertCanQueryRelatedTasks(ctx);
  await assertTaskContextEntityReadable(ctx, contextType, contextId);

  return prisma.task.count({
    where: buildRelatedTaskWhere(ctx, contextType, contextId.trim(), options),
  });
}
