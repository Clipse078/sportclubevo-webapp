/**
 * PLANNING-UX-07R4 — shared resource assignment copy (UI layer only).
 * Consumed via next-intl `PlanningResources` namespace in message JSON files.
 */

export const PLANNING_RESOURCE_ASSIGNMENT_MESSAGE_KEYS = [
  "free",
  "current",
  "occupied",
  "sharedWith",
  "assign",
  "change",
  "unassignedDressingRoom",
  "pickerTitleDressingRoom",
  "pickerTitlePitchHall",
  "pickerCancel",
  "globalOccupancyHeading",
  "changeDressingRoomFor",
  "assignDressingRoomFor",
  "changePitchHallFor",
  "assignPitchHallFor",
] as const;

export type PlanningResourceAssignmentMessageKey =
  (typeof PLANNING_RESOURCE_ASSIGNMENT_MESSAGE_KEYS)[number];
