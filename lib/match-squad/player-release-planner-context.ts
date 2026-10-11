/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R2.1 — shared entry contract for release planning UI.
 */

export type PlayerReleasePlannerEntryPoint = "TEAM_KADER" | "MATCH_AUFGEBOT";

export type PlayerReleasePlannerContext = {
  sourceTeamSeasonId: string;
  selectedPersonIds: string[];
  sourceEventId?: string;
  entryPoint: PlayerReleasePlannerEntryPoint;
};

export function buildPlannerCandidatesRequestBody(context: {
  personIds: string[];
  sourceEventId?: string;
  entryPoint?: PlayerReleasePlannerEntryPoint;
}): {
  personIds: string[];
  sourceEventId?: string;
  entryPoint?: PlayerReleasePlannerEntryPoint;
} {
  return {
    personIds: context.personIds,
    ...(context.sourceEventId ? { sourceEventId: context.sourceEventId } : {}),
    ...(context.entryPoint ? { entryPoint: context.entryPoint } : {}),
  };
}
