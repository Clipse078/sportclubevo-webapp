import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { isAwayTournamentOrganiserMissing } from "@/lib/tournaments/composer/tournament-composer-organiser";
import { validateHomePlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-validation";
import type { TournamentCreateTabId } from "@/lib/tournaments/tournament-create-workflow-config";
import { resolveTournamentCreateTabOrder } from "@/lib/tournaments/tournament-create-workflow-config";

export function computeTournamentCreateTabErrors(
  draft: TournamentComposerDraftPayload,
): Partial<Record<TournamentCreateTabId, boolean>> {
  const errors: Partial<Record<TournamentCreateTabId, boolean>> = {};
  const minParticipants = draft.homeAway === "HOME" ? 2 : 1;

  if (
    !draft.title.trim() ||
    !draft.seasonId ||
    draft.participants.length < minParticipants ||
    isAwayTournamentOrganiserMissing(draft)
  ) {
    errors.teams = true;
  }

  if (!draft.startAt) {
    errors.termin = true;
  }

  if (draft.homeAway === "HOME") {
    const plannerErrors = validateHomePlannerDraft(draft);
    if (Object.keys(plannerErrors).length > 0) {
      if (plannerErrors.competitionFormat || plannerErrors.groupMixStrategy) {
        errors.turnierformat = true;
      } else if (plannerErrors.pitches) {
        errors.spielfelder = true;
      } else {
        errors.spielplan = true;
      }
      if (!errors.turnierformat && !errors.spielfelder && !errors.spielplan) {
        errors.spielplan = true;
      }
    }
  }

  return errors;
}

export function firstInvalidTournamentCreateTab(
  errors: Partial<Record<TournamentCreateTabId, boolean>>,
  homeAway: "HOME" | "AWAY" = "HOME",
): TournamentCreateTabId | null {
  const order = resolveTournamentCreateTabOrder(homeAway);
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
