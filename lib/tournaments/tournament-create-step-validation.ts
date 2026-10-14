import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { TournamentCreateTabId } from "@/lib/tournaments/tournament-create-workflow-config";
import type { SceActivityCreateValidationResult } from "@/lib/sce/activity-composer/types";
import {
  compareWallClockRange,
  formatIsoDateKeyToDisplay,
  normalizeTimeInput,
  parseDisplayDateInput,
  splitDateTimeLocalValue,
} from "@/lib/sce/activity-datetime/sce-activity-datetime";

function teamsStepInvalid(draft: TournamentComposerDraftPayload): boolean {
  return !draft.title.trim() || !draft.seasonId || draft.participants.length === 0;
}

function terminStepInvalid(draft: TournamentComposerDraftPayload): boolean {
  return !draft.startAt;
}

function buildTeamsFieldErrors(draft: TournamentComposerDraftPayload): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (!draft.title.trim()) {
    fieldErrors.title = "Bitte einen Titel angeben.";
  }
  if (!draft.seasonId) {
    fieldErrors.seasonId = "Bitte eine Saison auswählen.";
  }
  if (draft.participants.length === 0) {
    fieldErrors.participants = "Mindestens ein teilnehmendes Team ist erforderlich.";
  }
  return fieldErrors;
}

function buildTerminFieldErrors(draft: TournamentComposerDraftPayload): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (!draft.startAt) {
    fieldErrors.date = "Bitte ein Datum eingeben.";
    fieldErrors.startTime = "Bitte eine Startzeit eingeben.";
    return fieldErrors;
  }

  const startParts = splitDateTimeLocalValue(draft.startAt);
  if (!startParts) {
    fieldErrors.date = "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.";
    fieldErrors.startTime = "Bitte eine gültige Startzeit im Format HH:MM eingeben.";
    return fieldErrors;
  }

  const dateParsed = parseDisplayDateInput(formatIsoDateKeyToDisplay(startParts.isoDateKey));
  if (!dateParsed.ok) {
    fieldErrors.date = dateParsed.error;
  }
  const startTimeParsed = normalizeTimeInput(startParts.time);
  if (!startTimeParsed.ok) {
    fieldErrors.startTime = startTimeParsed.error;
  }

  if (draft.endAt) {
    const endParts = splitDateTimeLocalValue(draft.endAt);
    if (!endParts) {
      fieldErrors.endTime = "Bitte eine gültige Endzeit im Format HH:MM eingeben.";
    } else {
      const endTimeParsed = normalizeTimeInput(endParts.time);
      if (!endTimeParsed.ok) {
        fieldErrors.endTime = endTimeParsed.error;
      } else if (startTimeParsed.ok) {
        const range = compareWallClockRange({
          startDate: startParts.isoDateKey,
          startTime: startTimeParsed.normalized,
          endDate: endParts.isoDateKey,
          endTime: endTimeParsed.normalized,
        });
        if (!range.ok) {
          fieldErrors.range = range.error;
        }
      }
    }
  }

  return fieldErrors;
}

export function validateTournamentCreateWorkflowStep(
  draft: TournamentComposerDraftPayload,
  stepKey: TournamentCreateTabId,
): SceActivityCreateValidationResult<TournamentCreateTabId> {
  const tabErrors: Partial<Record<TournamentCreateTabId, boolean>> = {};
  let fieldErrors: Record<string, string> = {};

  switch (stepKey) {
    case "teams":
      if (teamsStepInvalid(draft)) {
        tabErrors.teams = true;
        fieldErrors = buildTeamsFieldErrors(draft);
      }
      break;
    case "termin":
      if (terminStepInvalid(draft) || Object.keys(buildTerminFieldErrors(draft)).length > 0) {
        tabErrors.termin = true;
        fieldErrors = buildTerminFieldErrors(draft);
      }
      break;
    case "ressourcen":
    case "publikation":
    case "uebersicht":
      break;
    default:
      break;
  }

  const valid = Object.keys(tabErrors).length === 0;
  return {
    valid,
    tabErrors,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    firstInvalidTab: valid ? undefined : stepKey,
  };
}

export function resolveTournamentCreateStepValid(
  draft: TournamentComposerDraftPayload,
  stepKey: TournamentCreateTabId,
): boolean {
  switch (stepKey) {
    case "teams":
      return !teamsStepInvalid(draft);
    case "termin":
      return !terminStepInvalid(draft) && Object.keys(buildTerminFieldErrors(draft)).length === 0;
    case "ressourcen":
    case "publikation":
    case "uebersicht":
      return true;
    default:
      return false;
  }
}
