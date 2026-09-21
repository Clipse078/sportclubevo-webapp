/**
 * AUFGABEN-06F1 — shared security predicate for related Task list + count.
 */

import type { Prisma, TaskContextType, TaskStatus } from "@prisma/client";
import { buildTaskReadWhere } from "./visibility";
import type { TaskServiceContext } from "./types";
import type { ListTasksForContextOptions } from "./context-related-task-types";

type ContextTaskCursor = {
  createdAt: string;
  id: string;
};

export function decodeListTasksForContextCursor(
  raw: string | null | undefined,
): ContextTaskCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as ContextTaskCursor;
    if (parsed && typeof parsed.id === "string" && typeof parsed.createdAt === "string") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function buildRelatedTaskWhere(
  ctx: TaskServiceContext,
  contextType: TaskContextType,
  contextId: string,
  options?: ListTasksForContextOptions,
): Prisma.TaskWhereInput {
  const normalizedId = contextId.trim();
  const and: Prisma.TaskWhereInput[] = [
    buildTaskReadWhere(ctx),
    {
      tenantId: ctx.tenantId,
      contextType,
      contextId: normalizedId,
    },
  ];

  if (options?.rootsOnly) {
    and.push({ parentTaskId: null });
  }

  if (options?.statuses?.length) {
    and.push({ status: { in: options.statuses as TaskStatus[] } });
  }

  const cursor = decodeListTasksForContextCursor(options?.cursor);
  if (cursor) {
    const cursorCreated = new Date(cursor.createdAt);
    and.push({
      OR: [
        { createdAt: { lt: cursorCreated } },
        {
          AND: [{ createdAt: cursorCreated }, { id: { lt: cursor.id } }],
        },
      ],
    });
  }

  return { AND: and };
}

/** @deprecated Alias — prefer buildRelatedTaskWhere */
export const buildListTasksForContextWhere = buildRelatedTaskWhere;
