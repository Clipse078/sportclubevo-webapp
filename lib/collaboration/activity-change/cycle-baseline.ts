/**
 * SCE-COLLAB-01B-R2 — transient unresolved collaboration cycle baseline (client/server).
 */

import type { ActivityCollaborationDomain } from "@/lib/collaboration/activity-change/types";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";

export type MatchCollaborationCycleBaseline = Pick<
  MatchActivitySnapshot,
  | "matchId"
  | "dateKey"
  | "startTime"
  | "endTime"
  | "locationLabel"
  | "pitchLabel"
  | "dressingRoomLabel"
  | "status"
>;

export type TournamentCollaborationCycleBaseline = Pick<
  TournamentActivitySnapshot,
  | "tournamentId"
  | "dateKey"
  | "startTime"
  | "endTime"
  | "locationLabel"
  | "resourceLabel"
  | "status"
>;

export type TrainingCollaborationCycleBaseline = Pick<
  TrainingActivitySnapshot,
  | "sessionId"
  | "dateKey"
  | "startTime"
  | "endTime"
  | "playableVenueLabel"
  | "dressingRoomLabel"
  | "status"
>;

export type CollaborationCycleBaseline =
  | { domain: "MATCH"; baseline: MatchCollaborationCycleBaseline }
  | { domain: "TOURNAMENT"; baseline: TournamentCollaborationCycleBaseline }
  | { domain: "TRAINING"; baseline: TrainingCollaborationCycleBaseline };

export function matchSnapshotToCycleBaseline(
  snapshot: MatchActivitySnapshot,
): MatchCollaborationCycleBaseline {
  return {
    matchId: snapshot.matchId,
    dateKey: snapshot.dateKey,
    startTime: snapshot.startTime,
    endTime: snapshot.endTime,
    locationLabel: snapshot.locationLabel,
    pitchLabel: snapshot.pitchLabel,
    dressingRoomLabel: snapshot.dressingRoomLabel,
    status: snapshot.status,
  };
}

export function tournamentSnapshotToCycleBaseline(
  snapshot: TournamentActivitySnapshot,
): TournamentCollaborationCycleBaseline {
  return {
    tournamentId: snapshot.tournamentId,
    dateKey: snapshot.dateKey,
    startTime: snapshot.startTime,
    endTime: snapshot.endTime,
    locationLabel: snapshot.locationLabel,
    resourceLabel: snapshot.resourceLabel,
    status: snapshot.status,
  };
}

export function trainingSnapshotToCycleBaseline(
  snapshot: TrainingActivitySnapshot,
): TrainingCollaborationCycleBaseline {
  return {
    sessionId: snapshot.sessionId,
    dateKey: snapshot.dateKey,
    startTime: snapshot.startTime,
    endTime: snapshot.endTime,
    playableVenueLabel: snapshot.playableVenueLabel,
    dressingRoomLabel: snapshot.dressingRoomLabel,
    status: snapshot.status,
  };
}

export function mergeMatchCycleBaselineWithAfter(
  baseline: MatchCollaborationCycleBaseline,
  after: MatchActivitySnapshot,
): MatchActivitySnapshot {
  return {
    ...after,
    dateKey: baseline.dateKey,
    startTime: baseline.startTime,
    endTime: baseline.endTime,
    locationLabel: baseline.locationLabel,
    pitchLabel: baseline.pitchLabel,
    dressingRoomLabel: baseline.dressingRoomLabel,
    status: baseline.status,
    playableVenueLabel: after.playableVenueLabel,
  };
}

export function mergeTournamentCycleBaselineWithAfter(
  baseline: TournamentCollaborationCycleBaseline,
  after: TournamentActivitySnapshot,
): TournamentActivitySnapshot {
  return {
    ...after,
    dateKey: baseline.dateKey,
    startTime: baseline.startTime,
    endTime: baseline.endTime,
    locationLabel: baseline.locationLabel,
    resourceLabel: baseline.resourceLabel,
    status: baseline.status,
    playableVenueLabel: after.playableVenueLabel,
  };
}

export function mergeTrainingCycleBaselineWithAfter(
  baseline: TrainingCollaborationCycleBaseline,
  after: TrainingActivitySnapshot,
): TrainingActivitySnapshot {
  return {
    ...after,
    dateKey: baseline.dateKey,
    startTime: baseline.startTime,
    endTime: baseline.endTime,
    playableVenueLabel: baseline.playableVenueLabel,
    dressingRoomLabel: baseline.dressingRoomLabel,
    status: baseline.status,
  };
}

export function parseCollaborationCycleBaselineFromBody(
  body: Record<string, unknown>,
  domain: "MATCH",
  activityId: string,
): MatchCollaborationCycleBaseline | null;
export function parseCollaborationCycleBaselineFromBody(
  body: Record<string, unknown>,
  domain: "TOURNAMENT",
  activityId: string,
): TournamentCollaborationCycleBaseline | null;
export function parseCollaborationCycleBaselineFromBody(
  body: Record<string, unknown>,
  domain: "TRAINING",
  activityId: string,
): TrainingCollaborationCycleBaseline | null;
export function parseCollaborationCycleBaselineFromBody(
  body: Record<string, unknown>,
  domain: ActivityCollaborationDomain,
  activityId: string,
):
  | MatchCollaborationCycleBaseline
  | TournamentCollaborationCycleBaseline
  | TrainingCollaborationCycleBaseline
  | null {
  const raw = body.collaborationCycleBaseline;
  if (!raw || typeof raw !== "object") return null;

  if (domain === "MATCH") {
    const b = raw as MatchCollaborationCycleBaseline;
    if (b.matchId !== activityId) return null;
    return b;
  }
  if (domain === "TOURNAMENT") {
    const b = raw as TournamentCollaborationCycleBaseline;
    if (b.tournamentId !== activityId) return null;
    return b;
  }
  if (domain === "TRAINING") {
    const b = raw as TrainingCollaborationCycleBaseline;
    if (b.sessionId !== activityId) return null;
    return b;
  }
  return null;
}

export function stripCollaborationCycleBaselineFromBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...body };
  delete next.collaborationCycleBaseline;
  return next;
}

export const UNASSIGNED_RESOURCE_DISPLAY = "Nicht zugewiesen";
