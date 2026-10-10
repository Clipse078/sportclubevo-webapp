/**
 * User-facing copy when no players remain in the «Weitere Kaderspieler» list.
 */

export const MATCH_SQUAD_REMAINING_EMPTY_NO_ROSTER =
  "Für dieses Team sind aktuell keine Kaderspieler im Saison-Kader erfasst.";

export const MATCH_SQUAD_REMAINING_EMPTY_ALL_SELECTED =
  "Alle Kaderspieler sind aufgeboten.";

export function matchSquadRemainingEmptyMessage(rosterTotal: number): string {
  if (rosterTotal === 0) {
    return MATCH_SQUAD_REMAINING_EMPTY_NO_ROSTER;
  }
  return MATCH_SQUAD_REMAINING_EMPTY_ALL_SELECTED;
}
