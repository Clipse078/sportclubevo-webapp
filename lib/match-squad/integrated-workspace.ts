/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01A-R5 — integrated Aufgebot workspace gate.
 * When available, Matchcenter suppresses the duplicate Teilnehmer player roster.
 */

import { resolveMatchSquadAccess } from "@/lib/match-squad/auth";
import { resolveMatchSquadEventContext } from "@/lib/match-squad/event-context";
import { MatchSquadError } from "@/lib/match-squad/errors";

export type IntegratedMatchSquadWorkspace = {
  available: true;
  teamId: string;
  teamSeasonId: string;
};

export type IntegratedMatchSquadWorkspaceResolution =
  | IntegratedMatchSquadWorkspace
  | { available: false };

export type PlanningEventKind = "MATCH" | "TRAINING" | "TOURNAMENT" | "CLUB_EVENT";

/**
 * Match-only UX policy: detailed Teilnehmer player roster is redundant when Aufgebot
 * is the integrated preparation workspace. Other activity types keep Teilnehmer.
 */
export function shouldRenderMatchTeilnehmerDetailedPlayerRoster(input: {
  eventKind: PlanningEventKind;
  integratedMatchSquadWorkspaceAvailable: boolean;
}): boolean {
  if (input.eventKind !== "MATCH") {
    return true;
  }
  return !input.integratedMatchSquadWorkspaceAvailable;
}

export async function resolveIntegratedMatchSquadWorkspace(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  matchEventId: string;
}): Promise<IntegratedMatchSquadWorkspaceResolution> {
  let context;
  try {
    context = await resolveMatchSquadEventContext(input.tenantId, input.matchEventId);
  } catch (error) {
    if (error instanceof MatchSquadError) {
      return { available: false };
    }
    throw error;
  }

  const access = await resolveMatchSquadAccess({
    userId: input.userId,
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    teamId: context.teamId,
    teamSeasonId: context.teamSeasonId,
  });

  if (!access?.canView) {
    return { available: false };
  }

  return {
    available: true,
    teamId: context.teamId,
    teamSeasonId: context.teamSeasonId,
  };
}
