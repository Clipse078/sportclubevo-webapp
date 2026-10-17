import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";

export function validateHomePlannerDraft(
  draft: TournamentComposerDraftPayload,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (draft.homeAway !== "HOME") {
    return errors;
  }
  const planner = draft.planner;
  if (!planner) {
    errors.planner = "Turnierplanung fehlt.";
    return errors;
  }
  if (draft.participants.length < 2) {
    errors.participants = "Mindestens zwei Teilnehmer sind für die Turnierplanung erforderlich.";
  }
  if (planner.pitches.length < 1) {
    errors.pitches = "Mindestens ein Turnierfeld ist erforderlich.";
  }
  if (planner.timing.matchDurationMinutes <= 0) {
    errors.matchDurationMinutes = "Spieldauer muss positiv sein.";
  }
  if (planner.timing.transitionMinutes < 0) {
    errors.transitionMinutes = "Wechselzeit darf nicht negativ sein.";
  }
  if (planner.timing.minRestMinutes < 0) {
    errors.minRestMinutes = "Mindestpause darf nicht negativ sein.";
  }
  if (
    planner.groupMixStrategy === "SMART_MIX" &&
    (planner.smartMixTargetMatchesPerParticipant == null ||
      planner.smartMixTargetMatchesPerParticipant < 1)
  ) {
    errors.smartMixTarget = "Bitte eine gültige Spieleanzahl pro Team angeben.";
  }
  if (planner.meetingsPerOpponent < 1) {
    errors.meetingsPerOpponent = "Mindestens ein Spiel pro Gegner.";
  }
  for (const br of planner.breaks) {
    const missingBegin = !br.startLocalTime?.trim();
    const missingDuration = !br.durationMinutes || br.durationMinutes <= 0;
    if (missingBegin || missingDuration) {
      errors[`break-${br.localId}`] = "Bitte Beginn und Dauer der Pause angeben.";
      continue;
    }
    if (
      br.fieldSelectionAdvanced &&
      br.scope === "SELECTED_PITCHES" &&
      br.tournamentPitchLocalIds.length === 0
    ) {
      errors[`break-${br.localId}`] = "Bitte mindestens ein Feld für die Sperrzeit auswählen.";
    }
  }
  return errors;
}
