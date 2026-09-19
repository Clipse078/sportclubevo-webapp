/** Default tournament crest capacity for full dashboard event cards. */
export const MAX_VISIBLE_TOURNAMENT_LOGOS = 6;

/** Compact schedule row — fewer logos to prevent vertical growth. */
export const COMPACT_TOURNAMENT_LOGO_LIMIT = 4;

export function sliceTournamentParticipantLogos<T>(
  participants: readonly T[],
  maxVisible: number = MAX_VISIBLE_TOURNAMENT_LOGOS,
): { visible: T[]; overflowCount: number } {
  const visible = participants.slice(0, maxVisible);
  const overflowCount = Math.max(0, participants.length - visible.length);
  return { visible, overflowCount };
}
