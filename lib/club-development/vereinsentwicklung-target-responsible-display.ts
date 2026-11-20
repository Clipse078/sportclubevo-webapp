import "server-only";

/**
 * Batch assignee labels for Ziele workspace rows.
 * Target model has no dedicated assignee field yet — returns null per row (UI → «Nicht zugewiesen»).
 */
export function resolveTargetAssigneeLabelsById(
  targetRows: ReadonlyArray<{ id: string }>,
): Map<string, string | null> {
  return new Map(targetRows.map((row) => [row.id, null]));
}