/**
 * SCE-COLLAB-01A — human-facing change summaries (locale-aware hooks via labels map).
 */

import type { ActivityChangeEntry, ActivityChangeField } from "@/lib/collaboration/activity-change/types";
import { filterCommunicationWorthyChanges } from "@/lib/collaboration/activity-change/policy";

export type ActivityChangeFieldLabels = Record<ActivityChangeField, string>;

export const DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE: ActivityChangeFieldLabels = {
  DATE: "Datum",
  START_TIME: "Startzeit",
  END_TIME: "Endzeit",
  VENUE: "Ort",
  FACILITY: "Anlage",
  RESOURCE: "Ressource",
  STATUS: "Status",
};

export const MATCH_ACTIVITY_CHANGE_FIELD_LABELS_DE: ActivityChangeFieldLabels = {
  ...DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  START_TIME: "Anspielzeit",
  RESOURCE: "Spielfeld",
};

export const TOURNAMENT_ACTIVITY_CHANGE_FIELD_LABELS_DE: ActivityChangeFieldLabels = {
  ...DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  START_TIME: "Zeit",
  RESOURCE: "Spielfeld",
};

export function summarizeActivityChangeLine(
  entry: ActivityChangeEntry,
  labels: ActivityChangeFieldLabels = DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
): string {
  const label = labels[entry.field];
  const oldLabel = entry.displayOld ?? entry.oldValue ?? "—";
  const newLabel = entry.displayNew ?? entry.newValue ?? "—";
  return `${label}: ${oldLabel} → ${newLabel}`;
}

export function summarizeActivityChanges(
  entries: ActivityChangeEntry[],
  labels: ActivityChangeFieldLabels = DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
): string[] {
  return filterCommunicationWorthyChanges(entries).map((entry) =>
    summarizeActivityChangeLine(entry, labels),
  );
}

export function buildActivityChangeAnnouncementBody(input: {
  introLine: string;
  entries: ActivityChangeEntry[];
  scheduleLine?: string | null;
  labels?: ActivityChangeFieldLabels;
}): string {
  const lines = summarizeActivityChanges(input.entries, input.labels);
  const parts = [input.introLine.trim(), "", ...lines.map((line) => `• ${line}`)];
  if (input.scheduleLine?.trim()) {
    parts.push("", input.scheduleLine.trim());
  }
  return parts.join("\n").trim();
}
