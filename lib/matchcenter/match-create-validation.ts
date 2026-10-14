import type { MatchComposerDraftPayload } from "@/lib/matchcenter/composer/match-composer-draft-types";
import type { MatchCreateTabId } from "@/lib/matchcenter/match-create-workflow-config";

export function computeMatchCreateTabErrors(
  draft: MatchComposerDraftPayload,
): Partial<Record<MatchCreateTabId, boolean>> {
  const errors: Partial<Record<MatchCreateTabId, boolean>> = {};

  if (!draft.teamId) {
    errors.teams = true;
  }

  const hasOpponent =
    Boolean(draft.opponentExternalClubId) || Boolean(draft.opponentName.trim());
  if (!hasOpponent) {
    errors.teams = true;
  }

  if (!draft.startAt) {
    errors.termin = true;
  }

  if (draft.homeAway === "HOME") {
    const pitch = draft.resources.find((r) => r.kind === "pitch_hall");
    const homeRoom = draft.resources.find((r) => r.kind === "dressing_room_home");
    const awayRoom = draft.resources.find((r) => r.kind === "dressing_room_away");
    if (!pitch || !homeRoom || !awayRoom) {
      errors.ressourcen = true;
    }
  }

  return errors;
}

export function firstInvalidMatchCreateTab(
  errors: Partial<Record<MatchCreateTabId, boolean>>,
): MatchCreateTabId | null {
  const order: MatchCreateTabId[] = ["teams", "termin", "ressourcen", "spielbetrieb", "uebersicht"];
  for (const tab of order) {
    if (errors[tab]) return tab;
  }
  return null;
}

/** AWAY matches must preserve authoritative location strings verbatim (incl. provider suffixes). */
export function resolveMatchComposerPersistedLocation(payload: MatchComposerDraftPayload): string | null {
  const trimmed = payload.location.trim();
  if (!trimmed) return null;
  return trimmed;
}
