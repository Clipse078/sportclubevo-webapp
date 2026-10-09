/**
 * SCE-COLLAB-01C — club event before/after change detection.
 */

import type {
  ActivityChangeEntry,
  ActivityChangeImpact,
  ActivityChangeSet,
} from "@/lib/collaboration/activity-change/types";
import { buildActivityChangeFingerprint } from "@/lib/collaboration/activity-change/fingerprint";
import {
  filterCommunicationWorthyChanges,
  hasCommunicationWorthyChanges,
} from "@/lib/collaboration/activity-change/policy";
import { UNASSIGNED_RESOURCE_DISPLAY } from "@/lib/collaboration/activity-change/cycle-baseline";
import { displayClubEventCollaborationStatus } from "@/lib/collaboration/club-event/club-event-status-presentation";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";

function displayResourceLabel(value: string | null): string {
  return value?.trim() ? value : UNASSIGNED_RESOURCE_DISPLAY;
}

function entry(
  field: ActivityChangeEntry["field"],
  oldValue: string | null,
  newValue: string | null,
  displayOld: string | null,
  displayNew: string | null,
): ActivityChangeEntry {
  return { field, oldValue, newValue, displayOld, displayNew, significant: true };
}

export function diffClubEventActivitySnapshots(
  before: ClubEventActivitySnapshot,
  after: ClubEventActivitySnapshot,
): ActivityChangeEntry[] {
  const changes: ActivityChangeEntry[] = [];

  if (before.dateKey !== after.dateKey) {
    changes.push(entry("DATE", before.dateKey, after.dateKey, before.dateKey, after.dateKey));
  }

  if (!before.allDay && !after.allDay) {
    if (before.startTime !== after.startTime) {
      changes.push(
        entry(
          "START_TIME",
          before.startTime,
          after.startTime,
          before.startTime,
          after.startTime,
        ),
      );
    }
    if (before.endTime !== after.endTime) {
      changes.push(
        entry("END_TIME", before.endTime, after.endTime, before.endTime, after.endTime),
      );
    }
  } else if (before.allDay !== after.allDay) {
    if (before.startTime !== after.startTime) {
      changes.push(
        entry(
          "START_TIME",
          before.startTime,
          after.startTime,
          before.startTime ?? "Ganztägig",
          after.startTime ?? "Ganztägig",
        ),
      );
    }
    if (before.endTime !== after.endTime) {
      changes.push(
        entry(
          "END_TIME",
          before.endTime,
          after.endTime,
          before.endTime ?? "Ganztägig",
          after.endTime ?? "Ganztägig",
        ),
      );
    }
  }

  if (before.locationLabel !== after.locationLabel) {
    changes.push(
      entry(
        "VENUE",
        before.locationLabel,
        after.locationLabel,
        before.locationLabel,
        after.locationLabel,
      ),
    );
  }
  if (before.resourceLabel !== after.resourceLabel) {
    changes.push(
      entry(
        "RESOURCE",
        before.resourceLabel,
        after.resourceLabel,
        displayResourceLabel(before.resourceLabel),
        displayResourceLabel(after.resourceLabel),
      ),
    );
  }

  if (before.status !== after.status) {
    changes.push(
      entry(
        "STATUS",
        before.status,
        after.status,
        displayClubEventCollaborationStatus(before.status),
        displayClubEventCollaborationStatus(after.status),
      ),
    );
  }

  return changes;
}

export function buildClubEventActivityChangeSet(
  before: ClubEventActivitySnapshot,
  after: ClubEventActivitySnapshot,
): ActivityChangeSet | null {
  const entries = filterCommunicationWorthyChanges(
    diffClubEventActivitySnapshots(before, after),
  );
  if (entries.length === 0) return null;

  const fingerprint = buildActivityChangeFingerprint({
    domain: "CLUB_EVENT",
    activityId: after.eventId,
    entries,
  });

  return {
    domain: "CLUB_EVENT",
    activityId: after.eventId,
    entries,
    fingerprint,
  };
}

export function buildClubEventActivityChangeImpact(input: {
  before: ClubEventActivitySnapshot;
  after: ClubEventActivitySnapshot;
  audience: ActivityChangeImpact["audience"];
  canCommunicate: boolean;
}): ActivityChangeImpact {
  const changeSet = buildClubEventActivityChangeSet(input.before, input.after);
  const worthy = changeSet !== null && hasCommunicationWorthyChanges(changeSet.entries);

  return {
    worthy,
    activityTitle: input.after.title,
    activityScheduleLine: input.after.scheduleLine,
    changeSet,
    audience: worthy ? input.audience : null,
    canCommunicate: worthy ? input.canCommunicate : false,
  };
}
