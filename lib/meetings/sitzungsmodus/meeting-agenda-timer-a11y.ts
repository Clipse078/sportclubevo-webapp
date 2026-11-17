import type {
  MeetingAgendaTimerLifecycle,
  MeetingAgendaTimerPresentation,
} from "./meeting-agenda-timer-types";

export function buildTimerLiveRegionMessage(
  presentation: MeetingAgendaTimerPresentation,
  topicTitle: string | null,
  lifecycle: MeetingAgendaTimerLifecycle,
): string | null {
  if (lifecycle === "none" || lifecycle === "ready") return null;
  if (lifecycle !== "running" && lifecycle !== "expired" && lifecycle !== "paused") return null;
  const topic = topicTitle ? `Traktandum ${topicTitle}` : "Traktandum";
  if (presentation.kind === "warning" && lifecycle === "running") {
    return `${topic}: Letzte Minute, ${presentation.display} verbleibend`;
  }
  if (presentation.kind === "expired" && lifecycle === "expired") {
    return `${topic}: Geplante Zeit abgelaufen`;
  }
  if (presentation.kind === "overtime" && lifecycle === "expired") {
    return `${topic}: ${presentation.display}`;
  }
  return null;
}