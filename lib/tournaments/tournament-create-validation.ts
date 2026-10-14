import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { isAwayTournamentOrganiserMissing } from "@/lib/tournaments/composer/tournament-composer-organiser";
import type { TournamentCreateTabId } from "@/lib/tournaments/tournament-create-workflow-config";

export function computeTournamentCreateTabErrors(
  draft: TournamentComposerDraftPayload,
): Partial<Record<TournamentCreateTabId, boolean>> {
  const errors: Partial<Record<TournamentCreateTabId, boolean>> = {};

  if (
    !draft.title.trim() ||
    !draft.seasonId ||
    draft.participants.length === 0 ||
    isAwayTournamentOrganiserMissing(draft)
  ) {
    errors.teams = true;
  }

  if (!draft.startAt) {
    errors.termin = true;
  }

  return errors;
}

export function firstInvalidTournamentCreateTab(
  errors: Partial<Record<TournamentCreateTabId, boolean>>,
): TournamentCreateTabId | null {
  const order: TournamentCreateTabId[] = [
    "teams",
    "termin",
    "ressourcen",
    "publikation",
    "uebersicht",
  ];
  for (const tab of order) {
    if (errors[tab]) return tab;
  }
  return null;
}

/** AWAY tournaments preserve authoritative location strings verbatim. */
export function resolveTournamentComposerPersistedLocation(
  payload: TournamentComposerDraftPayload,
): string | null {
  const trimmed = payload.location.trim();
  if (!trimmed) return null;
  return trimmed;
}
