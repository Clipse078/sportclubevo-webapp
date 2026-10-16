/**
 * Human-readable qualification labels (display only — persistence uses structured sources).
 */

export function formatGroupRankQualificationLabel(rank: number, groupLabel: string): string {
  return `${rank}. ${groupLabel}`;
}

/** Stable group labels: Gruppe A … Z, then Gruppe AA, AB, … (display only). */
export function formatTournamentGroupLabel(zeroBasedIndex: number): string {
  if (!Number.isInteger(zeroBasedIndex) || zeroBasedIndex < 0) {
    throw new Error("Group label index must be a non-negative integer");
  }
  let n = zeroBasedIndex;
  let letters = "";
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Gruppe ${letters}`;
}
