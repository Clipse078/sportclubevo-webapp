/**
 * SCE-COLLAB-01A — training before/after change detection.
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
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";

function entry(
  field: ActivityChangeEntry["field"],
  oldValue: string | null,
  newValue: string | null,
  displayOld: string | null,
  displayNew: string | null,
): ActivityChangeEntry {
  return { field, oldValue, newValue, displayOld, displayNew, significant: true };
}

export function diffTrainingActivitySnapshots(
  before: TrainingActivitySnapshot,
  after: TrainingActivitySnapshot,
): ActivityChangeEntry[] {
  const changes: ActivityChangeEntry[] = [];

  if (before.dateKey !== after.dateKey) {
    changes.push(
      entry("DATE", before.dateKey, after.dateKey, before.dateKey, after.dateKey),
    );
  }
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
  if (before.playableVenueLabel !== after.playableVenueLabel) {
    changes.push(
      entry(
        "VENUE",
        before.playableVenueLabel,
        after.playableVenueLabel,
        before.playableVenueLabel,
        after.playableVenueLabel,
      ),
    );
  } else if (before.dressingRoomLabel !== after.dressingRoomLabel) {
    changes.push(
      entry(
        "RESOURCE",
        before.dressingRoomLabel,
        after.dressingRoomLabel,
        before.dressingRoomLabel,
        after.dressingRoomLabel,
      ),
    );
  }

  if (before.status !== after.status) {
    const display = (status: string) =>
      status === "CANCELLED" ? "Abgesagt" : status === "SCHEDULED" ? "Geplant" : status;
    changes.push(
      entry(
        "STATUS",
        before.status,
        after.status,
        display(before.status),
        display(after.status),
      ),
    );
  }

  return changes;
}

export function buildTrainingActivityChangeSet(
  before: TrainingActivitySnapshot,
  after: TrainingActivitySnapshot,
): ActivityChangeSet | null {
  const entries = filterCommunicationWorthyChanges(
    diffTrainingActivitySnapshots(before, after),
  );
  if (entries.length === 0) return null;

  const fingerprint = buildActivityChangeFingerprint({
    domain: "TRAINING",
    activityId: after.sessionId,
    entries,
  });

  return {
    domain: "TRAINING",
    activityId: after.sessionId,
    entries,
    fingerprint,
  };
}

export function buildTrainingActivityChangeImpact(input: {
  before: TrainingActivitySnapshot;
  after: TrainingActivitySnapshot;
  audience: ActivityChangeImpact["audience"];
  canCommunicate: boolean;
}): ActivityChangeImpact {
  const changeSet = buildTrainingActivityChangeSet(input.before, input.after);
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
