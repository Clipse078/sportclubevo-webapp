import type { MeetingAgendaTimerPresentation } from "./meeting-agenda-timer-types";

export function buildTimerLiveRegionMessage(
  presentation: MeetingAgendaTimerPresentation,
  topicTitle: string | null,
): string | null {
  const topic = topicTitle ? `Traktandum ${topicTitle}` : "Traktandum";
  if (presentation.kind === "warning") {
    return `${topic}: Letzte Minute, ${presentation.display} verbleibend`;
  }
  if (presentation.kind === "expired") {
    return `${topic}: Geplante Zeit abgelaufen`;
  }
  if (presentation.kind === "overtime") {
    return `${topic}: ${presentation.display}`;
  }
  return null;
}