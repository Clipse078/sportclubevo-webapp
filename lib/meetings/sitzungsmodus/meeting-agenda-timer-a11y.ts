import type {
  MeetingAgendaTimerLifecycle,
  MeetingAgendaTimerPresentation,
} from "./meeting-agenda-timer-types";

export type TimerLiveRegionMilestone = "at60" | "at10" | "expired" | "overtime";

export function resolveTimerLiveRegionMilestone(
  presentation: MeetingAgendaTimerPresentation,
  lifecycle: MeetingAgendaTimerLifecycle,
  remainingSec: number,
): TimerLiveRegionMilestone | null {
  if (lifecycle !== "running" && lifecycle !== "expired") return null;
  if (lifecycle === "expired" && presentation.kind === "overtime") return "overtime";
  if (presentation.kind === "expired") return "expired";
  if (presentation.kind === "warning" && Math.floor(remainingSec) === 60) return "at60";
  if (presentation.kind === "final" && Math.floor(remainingSec) === 10) return "at10";
  return null;
}

export function buildTimerLiveRegionMessage(
  presentation: MeetingAgendaTimerPresentation,
  topicTitle: string | null,
  lifecycle: MeetingAgendaTimerLifecycle,
  milestone: TimerLiveRegionMilestone,
): string {
  const topic = topicTitle ? `Traktandum ${topicTitle}` : "Traktandum";
  switch (milestone) {
    case "at60":
      return `${topic}: Noch eine Minute`;
    case "at10":
      return `${topic}: Letzte zehn Sekunden`;
    case "expired":
      return `${topic}: Geplante Zeit abgelaufen`;
    case "overtime":
      return `${topic}: Überzogen, ${presentation.display}`;
    default:
      return `${topic}: ${presentation.display}`;
  }
}