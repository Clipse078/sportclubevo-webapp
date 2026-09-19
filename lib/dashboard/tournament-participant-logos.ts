/** Maximum tournament participant identities shown before "+N" overflow. */
export const MAX_VISIBLE_TOURNAMENT_LOGOS = 16;

/**
 * @deprecated Use MAX_VISIBLE_TOURNAMENT_LOGOS — compact Heute-im-Verein uses the same cap.
 */
export const COMPACT_TOURNAMENT_LOGO_LIMIT = MAX_VISIBLE_TOURNAMENT_LOGOS;

export function sliceTournamentParticipantLogos<T>(
  participants: readonly T[],
  maxVisible: number = MAX_VISIBLE_TOURNAMENT_LOGOS,
): { visible: T[]; overflowCount: number } {
  const visible = participants.slice(0, maxVisible);
  const overflowCount = Math.max(0, participants.length - visible.length);
  return { visible, overflowCount };
}
