/**
 * Human-readable qualification labels (display only — persistence uses structured sources).
 */

export function formatGroupRankQualificationLabel(rank: number, groupLabel: string): string {
  return `${rank}. ${groupLabel}`;
}
