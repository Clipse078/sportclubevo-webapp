/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R1 — notification copy for targeted release awareness.
 */

export function buildTargetedPlayerReleaseAwarenessCopy(input: {
  sourceTeamLabel: string;
  targetTeamLabel: string;
  playerCount: number;
  activityKind?: "MATCH" | "TOURNAMENT" | null;
  activityTitle?: string | null;
  activityScheduleLine?: string | null;
}): { title: string; body: string } {
  const count = Math.max(1, input.playerCount);
  const playerWord = "Spieler";
  let title: string;
  if (input.activityKind === "MATCH" && input.activityTitle?.trim()) {
    title = `${input.sourceTeamLabel} hat ${count} ${playerWord} für euer Spiel gegen ${input.activityTitle.trim()} freigegeben.`;
  } else if (input.activityKind === "TOURNAMENT" && input.activityTitle?.trim()) {
    title = `${input.sourceTeamLabel} hat ${count} ${playerWord} für euer Turnier ${input.activityTitle.trim()} freigegeben.`;
  } else {
    title = `${input.sourceTeamLabel} hat ${count} ${playerWord} für ${input.targetTeamLabel} freigegeben.`;
  }
  const body =
    input.activityScheduleLine?.trim() ??
    "Die Spieler können für kommende Einsätze angefragt werden. Freigegeben ≠ Einsatzberechtigt · Freigegeben ≠ Zugewiesen.";
  return { title, body };
}

export function inboundPlayerReleaseActivityHref(input: {
  eventType: "MATCH" | "TOURNAMENT";
  eventId: string;
}): string {
  if (input.eventType === "TOURNAMENT") {
    return `/dashboard/tournamentcenter/${encodeURIComponent(input.eventId)}`;
  }
  return `/dashboard/matchcenter/${encodeURIComponent(input.eventId)}`;
}

export function inboundPlayerReleaseTeamKaderHref(teamId: string): string {
  return `/dashboard/teams/${encodeURIComponent(teamId)}/kader?freigegebeneSpieler=1`;
}
