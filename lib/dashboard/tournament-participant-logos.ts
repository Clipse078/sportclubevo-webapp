/** Dashboard tournament participant crest capacity (DASHBOARD-UX-01). */
export const MAX_VISIBLE_TOURNAMENT_LOGOS = 16;

export function sliceTournamentParticipantLogos<T>(
  participants: readonly T[],
  maxVisible: number = MAX_VISIBLE_TOURNAMENT_LOGOS,
): { visible: T[]; overflowCount: number } {
  const visible = participants.slice(0, maxVisible);
  const overflowCount = Math.max(0, participants.length - visible.length);
  return { visible, overflowCount };
}
