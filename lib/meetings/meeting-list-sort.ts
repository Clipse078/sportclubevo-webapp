import type { MeetingListItem } from "@/lib/meetings/queries";

function meetingTimeMs(meeting: Pick<MeetingListItem, "meetingDate">): number {
  return new Date(meeting.meetingDate).getTime();
}

/**
 * Upcoming meetings (meetingDate >= now), nearest first; then past meetings, most recent first.
 */
export function sortMeetingsForList<T extends Pick<MeetingListItem, "meetingDate">>(
  meetings: T[],
  now: Date = new Date(),
): T[] {
  const nowMs = now.getTime();
  const upcoming: T[] = [];
  const past: T[] = [];

  for (const meeting of meetings) {
    if (meetingTimeMs(meeting) >= nowMs) {
      upcoming.push(meeting);
    } else {
      past.push(meeting);
    }
  }

  upcoming.sort((a, b) => meetingTimeMs(a) - meetingTimeMs(b));
  past.sort((a, b) => meetingTimeMs(b) - meetingTimeMs(a));

  return [...upcoming, ...past];
}
