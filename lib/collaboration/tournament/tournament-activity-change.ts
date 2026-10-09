/**
 * SCE-COLLAB-01B — tournament before/after change detection.
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
import { displayTournamentCollaborationStatus } from "@/lib/collaboration/tournament/tournament-status-presentation";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";

function entry(
  field: ActivityChangeEntry["field"],
  oldValue: string | null,
  newValue: string | null,
  displayOld: string | null,
  displayNew: string | null,
): ActivityChangeEntry {
  return { field, oldValue, newValue, displayOld, displayNew, significant: true };
}

export function diffTournamentActivitySnapshots(
  before: TournamentActivitySnapshot,
  after: TournamentActivitySnapshot,
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
  }

  if (before.status !== after.status) {
    changes.push(
      entry(
        "STATUS",
        before.status,
        after.status,
        displayTournamentCollaborationStatus(before.status),
        displayTournamentCollaborationStatus(after.status),
      ),
    );
  }

  return changes;
}

export function buildTournamentActivityChangeSet(
  before: TournamentActivitySnapshot,
  after: TournamentActivitySnapshot,
): ActivityChangeSet | null {
  const entries = filterCommunicationWorthyChanges(
    diffTournamentActivitySnapshots(before, after),
  );
  if (entries.length === 0) return null;

  const fingerprint = buildActivityChangeFingerprint({
    domain: "TOURNAMENT",
    activityId: after.tournamentId,
    entries,
  });

  return {
    domain: "TOURNAMENT",
    activityId: after.tournamentId,
    entries,
    fingerprint,
  };
}

export function buildTournamentActivityChangeImpact(input: {
  before: TournamentActivitySnapshot;
  after: TournamentActivitySnapshot;
  audience: ActivityChangeImpact["audience"];
  canCommunicate: boolean;
}): ActivityChangeImpact {
  const changeSet = buildTournamentActivityChangeSet(input.before, input.after);
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
