import type { MatchComposerDraftPayload } from "@/lib/matchcenter/composer/match-composer-draft-types";
import type { MatchCreateTabId } from "@/lib/matchcenter/match-create-workflow-config";
import type { SceActivityCreateValidationResult } from "@/lib/sce/activity-composer/types";

function teamsStepInvalid(draft: MatchComposerDraftPayload): boolean {
  const hasOpponent =
    Boolean(draft.opponentExternalClubId) || Boolean(draft.opponentName.trim());
  return !draft.teamId || !hasOpponent;
}

function terminStepInvalid(draft: MatchComposerDraftPayload): boolean {
  return !draft.startAt;
}

function ressourcenStepInvalid(draft: MatchComposerDraftPayload): boolean {
  if (draft.homeAway !== "HOME") {
    return false;
  }
  const pitch = draft.resources.find((r) => r.kind === "pitch_hall");
  const homeRoom = draft.resources.find((r) => r.kind === "dressing_room_home");
  const awayRoom = draft.resources.find((r) => r.kind === "dressing_room_away");
  return !pitch || !homeRoom || !awayRoom;
}

export function validateMatchCreateWorkflowStep(
  draft: MatchComposerDraftPayload,
  stepKey: MatchCreateTabId,
): SceActivityCreateValidationResult<MatchCreateTabId> {
  const tabErrors: Partial<Record<MatchCreateTabId, boolean>> = {};

  switch (stepKey) {
    case "teams":
      if (teamsStepInvalid(draft)) {
        tabErrors.teams = true;
      }
      break;
    case "termin":
      if (terminStepInvalid(draft)) {
        tabErrors.termin = true;
      }
      break;
    case "ressourcen":
      if (ressourcenStepInvalid(draft)) {
        tabErrors.ressourcen = true;
      }
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
      return !terminStepInvalid(draft);
    case "ressourcen":
      return draft.homeAway === "AWAY" || !ressourcenStepInvalid(draft);
    case "spielbetrieb":
      return true;
    case "uebersicht":
      return false;
    default:
      return false;
  }
}
