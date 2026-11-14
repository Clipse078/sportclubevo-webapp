import "server-only";

import { TaskContextType, type Prisma } from "@prisma/client";

/**
 * Canonical OR filters for tasks associated with a Vorhaben (SCE-CD-04).
 * Matches initiative progress / detail semantics: INITIATIVE context and primaryInitiativeId.
 */
export function initiativeTaskAssociationOrFilters(
  initiativeId: string,
): Prisma.TaskWhereInput[] {
  return [
    { contextType: TaskContextType.INITIATIVE, contextId: initiativeId },
    { primaryInitiativeId: initiativeId },
  ];
}

export function dedupeTasksById<T extends { id: string }>(rows: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

/**
 * Grouping key for sprint planning: direct INITIATIVE context wins over primaryInitiativeId
 * (same precedence as club-development task pickers).
 */
export function resolveCanonicalInitiativeIdForTask(row: {
  contextType: TaskContextType | null;
  contextId: string | null;
  primaryInitiativeId: string | null;
}): string | null {
  if (row.contextType === TaskContextType.INITIATIVE && row.contextId) {
    return row.contextId;
  }
  return row.primaryInitiativeId;
}