export const UMSETZUNGSPLANUNG_DND_MIME = "application/x-sce-umsetzungsplanung-task";
export const UMSETZUNGSPLANUNG_PHASE_DND_MIME = "application/x-sce-umsetzungsplanung-planned-phase";

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

export type UmsetzungsplanungPhaseDragPayload = {
  sprintId: string;
};

export function serializeUmsetzungsplanungPhaseDragPayload(payload: UmsetzungsplanungPhaseDragPayload): string {
  return JSON.stringify(payload);
}

export function parseUmsetzungsplanungPhaseDragPayload(raw: string): UmsetzungsplanungPhaseDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as UmsetzungsplanungPhaseDragPayload;
    if (!parsed?.sprintId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function computePlannedPhaseListReorder(
  orderedIds: readonly string[],
  draggedId: string,
  dropIndex: number,
): string[] | null {
  const draggedIdx = orderedIds.indexOf(draggedId);
  if (draggedIdx < 0) return null;
  const rest = orderedIds.filter((id) => id !== draggedId);
  let insertIdx = dropIndex > draggedIdx ? dropIndex - 1 : dropIndex;
  insertIdx = Math.max(0, Math.min(rest.length, insertIdx));
  const next = [...rest.slice(0, insertIdx), draggedId, ...rest.slice(insertIdx)];
  return next.join(",") === orderedIds.join(",") ? null : next;
}