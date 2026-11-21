/** Minimum pointer movement before a task row gesture becomes drag (not navigation click). */
export const UMSETZUNGSPLANUNG_TASK_DRAG_THRESHOLD_PX = 5;

export function exceedsUmsetzungsplanungTaskDragThreshold(
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
): boolean {
  return Math.hypot(clientX - startX, clientY - startY) >= UMSETZUNGSPLANUNG_TASK_DRAG_THRESHOLD_PX;
}