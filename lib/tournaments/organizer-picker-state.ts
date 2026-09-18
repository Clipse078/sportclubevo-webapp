/**
 * TURNIERE-UX-02A — Veranstalter picker state (pure, no I/O).
 *
 * Persists as Event.organizerName (canonical club name when picked from the
 * Club Directory). organizerExternalClubId on TournamentDto is derived at
 * read time via organizer-club-resolver — no separate tournament club list.
 */

import type { ExternalClubPickerResult } from "@/components/admin/tournamentcenter/ExternalClubPicker";
import type { TournamentDto } from "./types";

/** Synthetic id for organizerName values not linked to a live directory row. */
export const TOURNAMENT_ORGANIZER_LEGACY_PICKER_ID = "__legacy-organizer__";

export function isLegacyOrganizerPickerId(id: string): boolean {
  return id === TOURNAMENT_ORGANIZER_LEGACY_PICKER_ID;
}

/**
 * Maps a loaded tournament to the shared ExternalClubPicker selection shape.
 * Legacy/unlinked text organizers use a synthetic id so the picker can render
 * a chip without implying a live directory row.
 */
export function organizerPickerSelectionFromTournament(
  tournament: Pick<TournamentDto, "organizerName" | "organizerLogoUrl" | "organizerExternalClubId">,
): ExternalClubPickerResult | null {
  const name = tournament.organizerName?.trim();
  if (!name) {
    return null;
  }

  if (tournament.organizerExternalClubId) {
    return {
      id: tournament.organizerExternalClubId,
      name,
      shortName: null,
      logoUrl: tournament.organizerLogoUrl,
    };
  }

  return {
    id: TOURNAMENT_ORGANIZER_LEGACY_PICKER_ID,
    name,
    shortName: null,
    logoUrl: tournament.organizerLogoUrl,
  };
}

/** Payload fragment for create/update APIs (still Event.organizerName). */
export function organizerNameFromPickerSelection(
  selection: ExternalClubPickerResult | null,
): string | null {
  if (!selection) {
    return null;
  }
  const trimmed = selection.name.trim();
  return trimmed || null;
}

export function organizerPickerSelectionsEqual(
  a: ExternalClubPickerResult | null,
  b: ExternalClubPickerResult | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.name === b.name;
}
