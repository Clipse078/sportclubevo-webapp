/**
 * AUFGABEN-06E — canonical related Tasks query (context never grants Task access).
 */

import type { Prisma, TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertTaskContextEntityReadable } from "./context-entity-read";
import { TaskForbiddenError } from "./errors";
import type {
  ContextRelatedTaskSummaryDto,
  ListTasksForContextOptions,
  ListTasksForContextPageDto,
} from "./context-related-task-types";
import { TASK_AUTH_INCLUDE } from "./task-access";
import { buildRelatedTaskWhere } from "./related-task-query";

export { decodeListTasksForContextCursor } from "./related-task-query";
import { hasTaskPermission } from "./visibility";
import type { TaskServiceContext } from "./types";

export { buildRelatedTaskWhere, buildListTasksForContextWhere } from "./related-task-query";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

function encodeCursor(cursor: { createdAt: string; id: string }): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function assertCanQueryRelatedTasks(ctx: TaskServiceContext): void {
  if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW)) {
    throw new TaskForbiddenError("Missing tasks.view");
  }
}

function mapSummary(
  row: Prisma.TaskGetPayload<{ include: typeof TASK_AUTH_INCLUDE }>,
): ContextRelatedTaskSummaryDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueAt: row.dueAt?.toISOString() ?? null,
    parentTaskId: row.parentTaskId,
    assignees: row.assignees.map((a) => ({
      userId: a.userId,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
    })),
  };
}

export async function listTasksForContext(
  ctx: TaskServiceContext,
  contextType: TaskContextType,
  contextId: string,
  options?: ListTasksForContextOptions,
): Promise<ListTasksForContextPageDto> {
  assertCanQueryRelatedTasks(ctx);
  await assertTaskContextEntityReadable(ctx, contextType, contextId);

  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const fetchSize = limit + 1;

  const rows = await prisma.task.findMany({
    where: buildRelatedTaskWhere(ctx, contextType, contextId.trim(), options),
    include: TASK_AUTH_INCLUDE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: fetchSize,
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows.at(-1);
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          createdAt: last.createdAt.toISOString(),
          id: last.id,
        })
      : null;

  return {
    tasks: pageRows.map(mapSummary),
    nextCursor,
    hasMore,
  };
}
