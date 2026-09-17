/** Minimum pointer movement before a block body gesture becomes drag (not click). */
export const PLANNING_HUB_DRAG_THRESHOLD_PX = 5;

export function exceedsDragThreshold(
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
): boolean {
  return Math.hypot(clientX - startX, clientY - startY) >= PLANNING_HUB_DRAG_THRESHOLD_PX;
}
