/**
 * SCE-COLLAB-01D-R2 — deterministic semantic compression for grouped training announcements.
 */

import type { ActivityChangeEntry, ActivityChangeField } from "@/lib/collaboration/activity-change/types";
import {
  DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  summarizeActivityChangeLine,
} from "@/lib/collaboration/activity-change/presentation";

export const MULTI_ACTIVITY_COMMUNICATION_SUMMARY_CLASSIFICATIONS = [
  "UNIFORM_RECURRING_CHANGE",
  "MIXED_CHANGES",
  "SMALL_EXPLICIT_SET",
] as const;

export type MultiActivityCommunicationSummaryClassification =
  (typeof MULTI_ACTIVITY_COMMUNICATION_SUMMARY_CLASSIFICATIONS)[number];

export type MultiTrainingCommunicationSummaryInput = {
  teamName: string;
  trainingTitle: string;
  timezone: string;
  locale: string;
  activities: Array<{
    activityId: string;
    dateKey: string;
    scheduleLine: string | null;
    startTime: string;
    endTime: string;
    entries: ActivityChangeEntry[];
  }>;
};

export type MultiActivityCommunicationSummary = {
  classification: MultiActivityCommunicationSummaryClassification;
  subject: string;
  bodyText: string;
  effectiveDateKey: string | null;
  weekdayLabel: string | null;
};

const MAX_EXPLICIT_ACTIVITY_LINES = 5;
const MAX_GROUPED_SIGNATURE_LINES = 8;
/** Soft guard — semantic compression should stay well below platform max. */
export const MULTI_ACTIVITY_COMMUNICATION_BODY_MAX_LINES = 32;

function changeSignature(entries: ActivityChangeEntry[]): string {
  return [...entries]
    .map((entry) => `${entry.field}:${entry.oldValue ?? ""}:${entry.newValue ?? ""}`)
    .sort()
    .join("|");
}

function weekdayLabelForDateKey(input: {
  dateKey: string;
  timezone: string;
  locale: string;
}): string {
  try {
    return new Intl.DateTimeFormat(input.locale, {
      weekday: "long",
      timeZone: input.timezone,
    }).format(new Date(`${input.dateKey}T12:00:00`));
  } catch {
    return "";
  }
}

function formatLongDateLabel(input: {
  dateKey: string;
  timezone: string;
  locale: string;
}): string {
  try {
    return new Intl.DateTimeFormat(input.locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: input.timezone,
    }).format(new Date(`${input.dateKey}T12:00:00`));
  } catch {
    const [year, month, day] = input.dateKey.split("-");
    if (year && month && day) return `${day}. ${month} ${year}`;
    return input.dateKey;
  }
}

function scheduleDatePrefix(scheduleLine: string | null, dateKey: string): string {
  if (scheduleLine?.includes(" · ")) {
    return scheduleLine.split(" · ")[0]!.trim();
  }
  return dateKey;
}

function sortedActivities(input: MultiTrainingCommunicationSummaryInput) {
  return [...input.activities].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function teamDisplayName(input: MultiTrainingCommunicationSummaryInput): string {
  const title = input.trainingTitle.trim();
  if (title && title !== input.teamName.trim()) return title;
  return input.teamName.trim() || "Team";
}

function uniformSubjectForField(field: ActivityChangeField, teamName: string): string {
  switch (field) {
    case "START_TIME":
    case "END_TIME":
      return `Trainingszeit geändert · ${teamName}`;
    case "VENUE":
    case "FACILITY":
      return `Trainingsort geändert · ${teamName}`;
    case "RESOURCE":
      return `Trainingsänderung · ${teamName}`;
    case "STATUS":
      return `Training abgesagt · ${teamName}`;
    case "DATE":
      return `Trainingstermin geändert · ${teamName}`;
    default:
      return `Trainingsänderungen · ${teamName}`;
  }
}

function timeWindowFromSnapshot(input: {
  startTime: string;
  endTime: string;
  entries: ActivityChangeEntry[];
  which: "before" | "after";
}): string | null {
  const startEntry = input.entries.find((row) => row.field === "START_TIME");
  const endEntry = input.entries.find((row) => row.field === "END_TIME");
  const start =
    input.which === "before"
      ? startEntry?.oldValue ?? input.startTime
      : startEntry?.newValue ?? input.startTime;
  const end =
    input.which === "before"
      ? endEntry?.oldValue ?? input.endTime
      : endEntry?.newValue ?? input.endTime;
  if (!start || !end) return null;
  return `${start}–${end}`;
}

function buildUniformRecurringBody(input: {
  summary: MultiTrainingCommunicationSummaryInput;
  weekdayLabel: string;
  effectiveDateKey: string;
  primaryField: ActivityChangeField;
  representative: MultiTrainingCommunicationSummaryInput["activities"][number];
}): string {
  const team = teamDisplayName(input.summary);
  const effectiveDate = formatLongDateLabel({
    dateKey: input.effectiveDateKey,
    timezone: input.summary.timezone,
    locale: input.summary.locale,
  });

  if (input.primaryField === "START_TIME" || input.primaryField === "END_TIME") {
    const neu = timeWindowFromSnapshot({
      startTime: input.representative.startTime,
      endTime: input.representative.endTime,
      entries: input.representative.entries,
      which: "after",
    });
    const bisher = timeWindowFromSnapshot({
      startTime: input.representative.startTime,
      endTime: input.representative.endTime,
      entries: input.representative.entries,
      which: "before",
    });
    const lines = [
      `Die Trainingszeit${team ? ` der ${team}` : ""} am ${input.weekdayLabel} wurde ab dem ${effectiveDate} geändert.`,
      "",
    ];
    if (neu) lines.push(`Neu: ${neu} Uhr`);
    if (bisher) lines.push(`Bisher: ${bisher} Uhr`);
    lines.push("", "Die Änderung gilt für die kommenden Trainings dieser Serie.");
    return lines.join("\n").trim();
  }

  if (input.primaryField === "VENUE" || input.primaryField === "FACILITY") {
    const entry = input.representative.entries.find(
      (row) => row.field === "VENUE" || row.field === "FACILITY",
    );
    const neu = entry?.displayNew ?? entry?.newValue;
    const bisher = entry?.displayOld ?? entry?.oldValue;
    const lines = [
      `Der Trainingsort${team ? ` der ${team}` : ""} am ${input.weekdayLabel} wurde ab dem ${effectiveDate} geändert.`,
      "",
    ];
    if (neu) lines.push(`Neu: ${neu}`);
    if (bisher) lines.push(`Bisher: ${bisher}`);
    lines.push("", "Die Änderung gilt für die kommenden Trainings dieser Serie.");
    return lines.join("\n").trim();
  }

  if (input.primaryField === "RESOURCE") {
    const entry = input.representative.entries.find((row) => row.field === "RESOURCE");
    const neu = entry?.displayNew ?? entry?.newValue;
    const lines = [
      `Das Training${team ? ` der ${team}` : ""} am ${input.weekdayLabel} findet ab dem ${effectiveDate}${
        neu ? ` auf ${neu}` : ""
      } statt.`,
      "",
      "Die Änderung gilt für die kommenden Trainings dieser Serie.",
    ];
    return lines.join("\n").trim();
  }

  if (input.primaryField === "STATUS") {
    return [
      `Das Training${team ? ` der ${team}` : ""} am ${input.weekdayLabel} wurde ab dem ${effectiveDate} abgesagt.`,
      "",
      "Die Änderung gilt für die kommenden Trainings dieser Serie.",
    ].join("\n");
  }

  return buildExplicitActivityBody(input.summary, sortedActivities(input.summary));
}

function buildExplicitActivityBody(
  input: MultiTrainingCommunicationSummaryInput,
  activities: MultiTrainingCommunicationSummaryInput["activities"],
): string {
  const count = activities.length;
  const intro =
    count === 1
      ? "Das Training wurde angepasst:"
      : count <= MAX_EXPLICIT_ACTIVITY_LINES
        ? `Mehrere Trainings wurden geändert (${count}):`
        : "Es wurden mehrere Trainings geändert:";

  const parts: string[] = [intro, ""];
  for (const activity of activities) {
    parts.push(scheduleDatePrefix(activity.scheduleLine, activity.dateKey));
    for (const entry of activity.entries) {
      parts.push(`• ${summarizeActivityChangeLine(entry, DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE)}`);
    }
    parts.push("");
  }
  return applyBodyLineGuard(parts.join("\n").trim());
}

function buildGroupedMixedBody(input: MultiTrainingCommunicationSummaryInput): string {
  const activities = sortedActivities(input);
  const groups = new Map<
    string,
    { signature: string; weekday: string; count: number; sample: (typeof activities)[number] }
  >();

  for (const activity of activities) {
    const signature = changeSignature(activity.entries);
    const weekday = weekdayLabelForDateKey({
      dateKey: activity.dateKey,
      timezone: input.timezone,
      locale: input.locale,
    });
    const key = `${signature}::${weekday}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { signature, weekday, count: 1, sample: activity });
    }
  }

  const parts: string[] = ["Es wurden mehrere Trainings geändert:", ""];
  let groupedLines = 0;
  let covered = 0;
  for (const group of groups.values()) {
    if (groupedLines >= MAX_GROUPED_SIGNATURE_LINES) break;
    const primaryField = group.sample.entries[0]?.field;
    const lineParts: string[] = [];
    if (primaryField === "START_TIME" || primaryField === "END_TIME") {
      const neu = timeWindowFromSnapshot({
        startTime: group.sample.startTime,
        endTime: group.sample.endTime,
        entries: group.sample.entries,
        which: "after",
      });
      const bisher = timeWindowFromSnapshot({
        startTime: group.sample.startTime,
        endTime: group.sample.endTime,
        entries: group.sample.entries,
        which: "before",
      });
      lineParts.push(
        `${group.count}× ${group.weekday}${neu && bisher ? `: ${bisher} → ${neu}` : ""}`.trim(),
      );
    } else {
      const summaryLine = group.sample.entries
        .map((entry) => summarizeActivityChangeLine(entry, DEFAULT_ACTIVITY_CHANGE_FIELD_LABELS_DE))
        .join("; ");
      lineParts.push(`${group.count}× ${group.weekday}: ${summaryLine}`);
    }
    parts.push(`• ${lineParts.join("")}`);
    groupedLines += 1;
    covered += group.count;
  }

  const remainder = activities.length - covered;
  if (remainder > 0) {
    parts.push("", `Weitere ${remainder} Trainings wurden geändert.`);
  }

  return applyBodyLineGuard(parts.join("\n").trim());
}

export function applyBodyLineGuard(bodyText: string): string {
  const lines = bodyText.split("\n");
  if (lines.length <= MULTI_ACTIVITY_COMMUNICATION_BODY_MAX_LINES) return bodyText.trim();
  const head = lines.slice(0, MULTI_ACTIVITY_COMMUNICATION_BODY_MAX_LINES - 2);
  head.push("", "Weitere Details sind in der Trainingsplanung einsehbar.");
  return head.join("\n").trim();
}

export function buildMultiTrainingCommunicationSummary(
  input: MultiTrainingCommunicationSummaryInput,
): MultiActivityCommunicationSummary {
  const activities = sortedActivities(input).filter((row) => row.entries.length > 0);
  const teamLabel = input.teamName.trim() || "Team";

  if (activities.length === 0) {
    return {
      classification: "SMALL_EXPLICIT_SET",
      subject: `Trainingsänderungen · ${teamLabel}`,
      bodyText: "Es wurden Trainings geändert.",
      effectiveDateKey: null,
      weekdayLabel: null,
    };
  }

  const signatures = new Set(activities.map((row) => changeSignature(row.entries)));
  const weekdays = new Set(
    activities.map((row) =>
      weekdayLabelForDateKey({ dateKey: row.dateKey, timezone: input.timezone, locale: input.locale }),
    ),
  );
  const effectiveDateKey = activities[0]!.dateKey;
  const weekdayLabel =
    weekdays.size === 1
      ? [...weekdays][0]!
      : weekdayLabelForDateKey({
          dateKey: effectiveDateKey,
          timezone: input.timezone,
          locale: input.locale,
        });

  if (activities.length === 1) {
    const only = activities[0]!;
    const field = only.entries[0]?.field ?? "START_TIME";
    return {
      classification: "SMALL_EXPLICIT_SET",
      subject: uniformSubjectForField(field, teamLabel),
      bodyText: buildExplicitActivityBody(input, activities),
      effectiveDateKey,
      weekdayLabel,
    };
  }

  if (signatures.size === 1 && weekdays.size === 1) {
    const representative = activities[0]!;
    const primaryField = representative.entries[0]!.field;
    return {
      classification: "UNIFORM_RECURRING_CHANGE",
      subject: uniformSubjectForField(primaryField, teamLabel),
      bodyText: buildUniformRecurringBody({
        summary: input,
        weekdayLabel,
        effectiveDateKey,
        primaryField,
        representative,
      }),
      effectiveDateKey,
      weekdayLabel,
    };
  }

  if (activities.length <= MAX_EXPLICIT_ACTIVITY_LINES) {
    return {
      classification: "SMALL_EXPLICIT_SET",
      subject: `Trainingsänderungen · ${teamLabel}`,
      bodyText: buildExplicitActivityBody(input, activities),
      effectiveDateKey,
      weekdayLabel,
    };
  }

  return {
    classification: "MIXED_CHANGES",
    subject: `Trainingsänderungen · ${teamLabel}`,
    bodyText: buildGroupedMixedBody(input),
    effectiveDateKey,
    weekdayLabel,
  };
}

export function buildMultiTrainingChangeSubjectFromSummary(input: {
  teamName: string;
  summary: MultiActivityCommunicationSummary;
}): string {
  return input.summary.subject;
}

export function buildMultiTrainingChangeAnnouncementBodyFromSummary(input: {
  summary: MultiActivityCommunicationSummary;
}): string {
  return input.summary.bodyText;
}
