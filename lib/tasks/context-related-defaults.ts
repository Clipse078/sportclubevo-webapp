import type { TaskStatus } from "@prisma/client";

/** Default actionable root Tasks on entity detail surfaces (06F1). */
export const DEFAULT_ENTITY_RELATED_TASK_STATUSES: TaskStatus[] = ["OPEN", "IN_PROGRESS"];

export const DEFAULT_ENTITY_RELATED_TASK_LIMIT = 5;

export const DEFAULT_ENTITY_RELATED_TASK_ROOTS_ONLY = true;
