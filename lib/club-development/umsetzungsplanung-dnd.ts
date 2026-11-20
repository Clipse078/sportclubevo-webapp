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