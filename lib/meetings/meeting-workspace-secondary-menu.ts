import type { MeetingStatus } from "@prisma/client";

/**
 * Secondary actions under «Weitere Aktionen» on the meeting workspace summary.
 * Print is always available for managers; close only while PLANNED; delete is permission-gated.
 */
export function hasMeetingSecondaryMenuItems(input: {
  canManage: boolean;
}): boolean {
  return input.canManage;
}

export function meetingShowsCloseInSecondaryMenu(status: MeetingStatus): boolean {
  return status === "PLANNED";
}