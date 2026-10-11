/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R1 — notification copy for targeted release awareness.
 */

export function buildTargetedPlayerReleaseAwarenessCopy(input: {
  sourceTeamLabel: string;
  targetTeamLabel: string;
  playerCount: number;
}): { title: string; body: string } {
  const count = Math.max(1, input.playerCount);
  const playerWord = count === 1 ? "Spieler" : "Spieler";
  const title = `${input.sourceTeamLabel} hat ${count} ${playerWord} für ${input.targetTeamLabel} freigegeben.`;
  const body =
    "Die Spieler können für kommende Einsätze angefragt werden. Freigegeben ≠ Einsatzberechtigt · Freigegeben ≠ Zugewiesen.";
  return { title, body };
}

export function inboundPlayerReleaseTeamKaderHref(teamId: string): string {
  return `/dashboard/teams/${encodeURIComponent(teamId)}/kader?freigegebeneSpieler=1`;
}
