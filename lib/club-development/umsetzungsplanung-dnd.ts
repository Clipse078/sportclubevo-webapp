export const UMSETZUNGSPLANUNG_DND_MIME = "application/x-sce-umsetzungsplanung-task";

export type UmsetzungsplanungDragSource = "unplanned" | "phase";

export type UmsetzungsplanungDragPayload = {
  taskId: string;
  source: UmsetzungsplanungDragSource;
  sourcePhaseId?: string;
};

export function serializeUmsetzungsplanungDragPayload(payload: UmsetzungsplanungDragPayload): string {
  return JSON.stringify(payload);
}

export function parseUmsetzungsplanungDragPayload(raw: string): UmsetzungsplanungDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as UmsetzungsplanungDragPayload;
    if (!parsed?.taskId || (parsed.source !== "unplanned" && parsed.source !== "phase")) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Pure list reorder for Ungeplant rank drag-and-drop (drop index = insertion line index). */
export function computeUnplannedListReorder<T extends { taskId: string }>(
  rows: readonly T[],
  draggedId: string,
  dropIndex: number,
): T[] | null {
  const draggedIdx = rows.findIndex((r) => r.taskId === draggedId);
  if (draggedIdx < 0) return null;

  const rest = rows.filter((r) => r.taskId !== draggedId);
  let insertIdx = dropIndex > draggedIdx ? dropIndex - 1 : dropIndex;
  insertIdx = Math.max(0, Math.min(rest.length, insertIdx));
  const moved = rows[draggedIdx]!;
  const next = [...rest.slice(0, insertIdx), moved, ...rest.slice(insertIdx)];
  const unchanged = next.map((r) => r.taskId).join(",") === rows.map((r) => r.taskId).join(",");
  return unchanged ? null : next;
}