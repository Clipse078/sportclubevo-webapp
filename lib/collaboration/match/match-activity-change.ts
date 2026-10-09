/**
 * SCE-COLLAB-01B — match before/after change detection.
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
import { displayMatchCollaborationStatus } from "@/lib/collaboration/match/match-status-presentation";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";

function entry(
  field: ActivityChangeEntry["field"],
  oldValue: string | null,
  newValue: string | null,
  displayOld: string | null,
  displayNew: string | null,
): ActivityChangeEntry {
  return { field, oldValue, newValue, displayOld, displayNew, significant: true };
}

export function diffMatchActivitySnapshots(
  before: MatchActivitySnapshot,
  after: MatchActivitySnapshot,
): ActivityChangeEntry[] {
  const changes: ActivityChangeEntry[] = [];

  if (before.dateKey !== after.dateKey) {
    changes.push(entry("DATE", before.dateKey, after.dateKey, before.dateKey, after.dateKey));
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
    changes.push(
      entry(
        "STATUS",
        before.status,
        after.status,
        displayMatchCollaborationStatus(before.status),
        displayMatchCollaborationStatus(after.status),
      ),
    );
  }

  return changes;
}

export function buildMatchActivityChangeSet(
  before: MatchActivitySnapshot,
  after: MatchActivitySnapshot,
): ActivityChangeSet | null {
  const entries = filterCommunicationWorthyChanges(diffMatchActivitySnapshots(before, after));
  if (entries.length === 0) return null;

  const fingerprint = buildActivityChangeFingerprint({
    domain: "MATCH",
    activityId: after.matchId,
    entries,
  });

  return {
    domain: "MATCH",
    activityId: after.matchId,
    entries,
    fingerprint,
  };
}

export function buildMatchActivityChangeImpact(input: {
  before: MatchActivitySnapshot;
  after: MatchActivitySnapshot;
  audience: ActivityChangeImpact["audience"];
  canCommunicate: boolean;
}): ActivityChangeImpact {
  const changeSet = buildMatchActivityChangeSet(input.before, input.after);
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
