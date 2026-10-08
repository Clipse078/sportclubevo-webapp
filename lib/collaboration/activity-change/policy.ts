/**
 * SCE-COLLAB-01A — communication-worthy change policy.
 */

import type { ActivityChangeEntry, ActivityChangeField } from "@/lib/collaboration/activity-change/types";

const COMMUNICATION_WORTHY_FIELDS = new Set<ActivityChangeField>([
  "DATE",
  "START_TIME",
  "END_TIME",
  "VENUE",
  "FACILITY",
  "RESOURCE",
  "STATUS",
]);

export function isCommunicationWorthyChangeField(field: ActivityChangeField): boolean {
  return COMMUNICATION_WORTHY_FIELDS.has(field);
}

export function filterCommunicationWorthyChanges(
  entries: ActivityChangeEntry[],
): ActivityChangeEntry[] {
  return entries.filter(
    (entry) => entry.significant && isCommunicationWorthyChangeField(entry.field),
  );
}

export function hasCommunicationWorthyChanges(entries: ActivityChangeEntry[]): boolean {
  return filterCommunicationWorthyChanges(entries).length > 0;
}
