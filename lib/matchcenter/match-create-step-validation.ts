import type { MatchComposerDraftPayload } from "@/lib/matchcenter/composer/match-composer-draft-types";
import type { MatchCreateTabId } from "@/lib/matchcenter/match-create-workflow-config";
import type { SceActivityCreateValidationResult } from "@/lib/sce/activity-composer/types";
import {
  formatIsoDateKeyToDisplay,
  parseDisplayDateInput,
  normalizeTimeInput,
  splitDateTimeLocalValue,
  compareWallClockRange,
} from "@/lib/sce/activity-datetime/sce-activity-datetime";

function teamsStepInvalid(draft: MatchComposerDraftPayload): boolean {
  const hasOpponent =
    Boolean(draft.opponentExternalClubId) || Boolean(draft.opponentName.trim());
  return !draft.teamId || !hasOpponent;
}

function terminStepInvalid(draft: MatchComposerDraftPayload): boolean {
  return !draft.startAt;
}

function buildTeamsFieldErrors(draft: MatchComposerDraftPayload): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const hasOpponent =
    Boolean(draft.opponentExternalClubId) || Boolean(draft.opponentName.trim());

  if (!draft.teamId && !hasOpponent) {
    fieldErrors.teams = "Bitte eigenes Team und Gegner auswählen.";
  } else if (!draft.teamId) {
    fieldErrors.teamId = "Bitte ein eigenes Team auswählen.";
  } else if (!hasOpponent) {
    fieldErrors.opponent = "Bitte einen Gegner auswählen.";
  }
  return fieldErrors;
}

function buildTerminFieldErrors(draft: MatchComposerDraftPayload): Record<string, string> {
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

export function validateMatchCreateWorkflowStep(
  draft: MatchComposerDraftPayload,
  stepKey: MatchCreateTabId,
): SceActivityCreateValidationResult<MatchCreateTabId> {
  const tabErrors: Partial<Record<MatchCreateTabId, boolean>> = {};
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
      break;
    case "spielbetrieb":
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

export function resolveMatchCreateStepComplete(
  draft: MatchComposerDraftPayload,
  stepKey: MatchCreateTabId,
): boolean {
  switch (stepKey) {
    case "teams":
      return !teamsStepInvalid(draft);
    case "termin":
      return !terminStepInvalid(draft) && Object.keys(buildTerminFieldErrors(draft)).length === 0;
    case "ressourcen":
      return true;
    case "spielbetrieb":
      return true;
    case "uebersicht":
      return false;
    default:
      return false;
  }
}

export function resolveMatchCreateGuidedValidationMessage(
  fieldErrors: Record<string, string> | undefined,
): string | null {
  if (!fieldErrors) {
    return null;
  }
  const first = Object.values(fieldErrors)[0];
  return first ?? null;
}
