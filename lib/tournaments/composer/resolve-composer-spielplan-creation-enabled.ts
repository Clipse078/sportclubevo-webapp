import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import type { TournamentComposerPlannerDraft } from "./tournament-composer-planner-types";
import { isGenericDefaultComposerPitchDraft } from "./tournament-composer-programme-proposal";

function hasEstablishedPlannerDraft(planner: TournamentComposerPlannerDraft): boolean {
  if (planner.programmeTemplateId) return true;
  if (planner.pitchesUserCustomized === true) return true;
  if (planner.breaks.length > 0) return true;
  if (planner.mainPause?.enabled === true) return true;
  if (!isGenericDefaultComposerPitchDraft(planner.pitches)) return true;
  return false;
}

/**
 * Authoritative flag: should the tournament creator expose planner / Spielplan workflow?
 * New tournaments default OFF; legacy drafts without the field stay ON when planner state exists.
 */
export function resolveComposerSpielplanCreationEnabled(
  payload: Pick<
    TournamentComposerDraftPayload,
    "homeAway" | "spielplanCreationEnabled" | "planner"
  >,
): boolean {
  if (payload.homeAway !== "HOME") return false;
  if (payload.spielplanCreationEnabled === true) return true;
  if (payload.spielplanCreationEnabled === false) return false;
  if (payload.planner && hasEstablishedPlannerDraft(payload.planner)) return true;
  return false;
}

export function shouldPersistComposerPlanner(
  payload: TournamentComposerDraftPayload,
): boolean {
  return resolveComposerSpielplanCreationEnabled(payload);
}
