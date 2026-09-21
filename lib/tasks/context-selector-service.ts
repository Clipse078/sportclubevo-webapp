import type { TaskContextType } from "@prisma/client";
import { isSupportedTaskContextType } from "./context-registry";
import { searchTaskContextOptionsForType } from "./task-context-registry";
import { canAttachTaskContext } from "./context-access";
import type { TaskServiceContext } from "./types";

export type { TaskContextOption } from "./task-context-registry";

const DEFAULT_LIMIT = 20;

export async function searchTaskContextOptions(
  ctx: TaskServiceContext,
  contextType: TaskContextType,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<import("./task-context-registry").TaskContextOption[]> {
  if (!isSupportedTaskContextType(contextType)) return [];
  if (!canAttachTaskContext(ctx, contextType)) return [];

  const take = Math.min(Math.max(limit, 1), 50);
  return searchTaskContextOptionsForType(ctx, contextType, query, take);
}
