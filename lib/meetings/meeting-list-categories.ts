/**
 * SCE-CD-02R9 — overview groupings (upcoming / past open / completed / cancelled).
 */

import type { MeetingStatus } from "@prisma/client";

export type MeetingListCategory =
  | "upcoming"
  | "past_open"
  | "completed"
  | "cancelled";

export type MeetingListCategorizable = {
  status: MeetingStatus;
  meetingDate: Date | string;
};

export function categorizeMeeting(
  meeting: MeetingListCategorizable,
  now: Date = new Date(),
): MeetingListCategory {
  if (meeting.status === "CANCELLED") return "cancelled";
  if (meeting.status === "COMPLETED") return "completed";
  const ms = new Date(meeting.meetingDate).getTime();
  if (Number.isFinite(ms) && ms >= now.getTime()) return "upcoming";
  return "past_open";
}

export const MEETING_LIST_CATEGORY_LABELS: Record<MeetingListCategory, string> = {
  upcoming: "Kommende Sitzungen",
  past_open: "Vergangene, noch offene Sitzungen",
  completed: "Abgeschlossene Sitzungen",
  cancelled: "Abgesagte Sitzungen",
};

export function groupMeetingsByCategory<T extends MeetingListCategorizable>(
  meetings: T[],
  now?: Date,
): Record<MeetingListCategory, T[]> {
  const groups: Record<MeetingListCategory, T[]> = {
    upcoming: [],
    past_open: [],
    completed: [],
    cancelled: [],
  };
  for (const m of meetings) {
    groups[categorizeMeeting(m, now)].push(m);
  }
  return groups;
}
