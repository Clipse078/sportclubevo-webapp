/**
 * SCE-COLLAB-01D — grouped announcement copy for combinable training impacts.
 */

import type { ActivityChangeEntry } from "@/lib/collaboration/activity-change/types";
import {
  buildMultiTrainingCommunicationSummary,
  type MultiActivityCommunicationSummary,
} from "@/lib/collaboration/multi-activity/multi-activity-communication-summary";

export type MultiTrainingActivityChangeSummary = {
  scheduleLine: string | null;
  dateKey: string;
  startTime: string;
  endTime: string;
  entries: ActivityChangeEntry[];
};

export function buildMultiTrainingChangeAnnouncementBody(input: {
  summaries: MultiTrainingActivityChangeSummary[];
  teamName: string;
  trainingTitle: string;
  timezone: string;
  locale?: string;
}): string {
  const summary = buildMultiTrainingCommunicationSummary({
    teamName: input.teamName,
    trainingTitle: input.trainingTitle,
    timezone: input.timezone,
    locale: input.locale ?? "de-CH",
    activities: input.summaries.map((row, index) => ({
      activityId: `activity-${index}`,
      dateKey: row.dateKey,
      scheduleLine: row.scheduleLine,
      startTime: row.startTime,
      endTime: row.endTime,
      entries: row.entries,
    })),
  });
  return summary.bodyText;
}

export function buildMultiTrainingChangeSubject(input: {
  teamName: string;
  summaries: MultiTrainingActivityChangeSummary[];
  trainingTitle: string;
  timezone: string;
  locale?: string;
}): string {
  const summary = buildMultiTrainingCommunicationSummary({
    teamName: input.teamName,
    trainingTitle: input.trainingTitle,
    timezone: input.timezone,
    locale: input.locale ?? "de-CH",
    activities: input.summaries.map((row, index) => ({
      activityId: `activity-${index}`,
      dateKey: row.dateKey,
      scheduleLine: row.scheduleLine,
      startTime: row.startTime,
      endTime: row.endTime,
      entries: row.entries,
    })),
  });
  return summary.subject;
}

export function buildMultiTrainingPresentationSummary(input: {
  teamName: string;
  trainingTitle: string;
  timezone: string;
  locale?: string;
  summaries: MultiTrainingActivityChangeSummary[];
}): MultiActivityCommunicationSummary {
  return buildMultiTrainingCommunicationSummary({
    teamName: input.teamName,
    trainingTitle: input.trainingTitle,
    timezone: input.timezone,
    locale: input.locale ?? "de-CH",
    activities: input.summaries.map((row, index) => ({
      activityId: `activity-${index}`,
      dateKey: row.dateKey,
      scheduleLine: row.scheduleLine,
      startTime: row.startTime,
      endTime: row.endTime,
      entries: row.entries,
    })),
  });
}
