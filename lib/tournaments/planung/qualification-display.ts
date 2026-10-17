/**
 * Human-readable qualification placeholders for Planung (display only).
 */

import { formatGroupRankQualificationLabel } from "@/lib/tournament-scheduling/competition-structure/display-labels";

export function formatKnockoutRoundSlotLabel(roundIndex: number, slotIndexInRound: number): string {
  return `R${roundIndex + 1} · Spiel ${slotIndexInRound + 1}`;
}

export function formatWinnerOfFixtureLabel(sourceFixture: {
  roundIndex: number;
  slotIndexInRound: number;
}): string {
  return `Sieger ${formatKnockoutRoundSlotLabel(sourceFixture.roundIndex, sourceFixture.slotIndexInRound)}`;
}

export function formatGroupRankPlaceholder(rank: number, groupLabel: string): string {
  return formatGroupRankQualificationLabel(rank, groupLabel);
}
