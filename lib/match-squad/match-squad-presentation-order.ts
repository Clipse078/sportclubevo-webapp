/**
 * MATCH_SQUAD_AVAILABILITY_SORTING-01 — presentation order within squad groups.
 * Primary: availability (Verfügbar → Unsicher → Offen → Nicht verfügbar).
 * Secondary: roster sortOrder, then shirt number, then display name (de locale).
 */

import { getMatchAvailabilitySortPriority } from "@/lib/match-squad/match-availability-presentation";
import type { MatchSquadPlayerPresentation } from "@/lib/match-squad/types";

export function compareMatchSquadPlayersByPresentationOrder(
  a: MatchSquadPlayerPresentation,
  b: MatchSquadPlayerPresentation,
): number {
  const byAvailability =
    getMatchAvailabilitySortPriority(a.presentationStatus) -
    getMatchAvailabilitySortPriority(b.presentationStatus);
  if (byAvailability !== 0) {
    return byAvailability;
  }

  const bySortOrder = a.sortOrder - b.sortOrder;
  if (bySortOrder !== 0) {
    return bySortOrder;
  }

  const shirtA = a.shirtNumber ?? Number.MAX_SAFE_INTEGER;
  const shirtB = b.shirtNumber ?? Number.MAX_SAFE_INTEGER;
  if (shirtA !== shirtB) {
    return shirtA - shirtB;
  }

  return a.displayName.localeCompare(b.displayName, "de");
}

export function sortMatchSquadPlayersForPresentation(
  players: readonly MatchSquadPlayerPresentation[],
): MatchSquadPlayerPresentation[] {
  return [...players].sort(compareMatchSquadPlayersByPresentationOrder);
}
