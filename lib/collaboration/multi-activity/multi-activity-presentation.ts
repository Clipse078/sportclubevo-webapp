/**
 * SCE-COLLAB-01D — grouped announcement copy for combinable training impacts.
 */

import type { ActivityChangeEntry } from "@/lib/collaboration/activity-change/types";
import {
  DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  summarizeActivityChangeLine,
} from "@/lib/collaboration/activity-change/presentation";

export type MultiTrainingActivityChangeSummary = {
  scheduleLine: string | null;
  dateKey: string;
  entries: ActivityChangeEntry[];
};

function formatShortDateLine(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return dateKey;
  return `${day}.${month}.${year}`;
}

export function buildMultiTrainingChangeAnnouncementBody(input: {
  summaries: MultiTrainingActivityChangeSummary[];
}): string {
  const count = input.summaries.length;
  const intro =
    count === 1
      ? "Das Training wurde angepasst:"
      : `Mehrere Trainings wurden geändert (${count}):`;

  const parts: string[] = [intro, ""];

  for (const summary of input.summaries) {
    const dateLabel = summary.scheduleLine?.split(" · ")[0]?.trim() ?? formatShortDateLine(summary.dateKey);
    parts.push(dateLabel);
    for (const entry of summary.entries) {
      parts.push(`• ${summarizeActivityChangeLine(entry, DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE)}`);
    }
    parts.push("");
  }

  return parts.join("\n").trim();
}

export function buildMultiTrainingChangeSubject(teamName: string, activityCount: number): string {
  if (activityCount <= 1) {
    return `Änderung: Training ${teamName}`.trim();
  }
  return `Änderung: ${activityCount} Trainings · ${teamName}`.trim();
}
