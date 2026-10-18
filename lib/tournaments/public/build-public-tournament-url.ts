/**
 * Stable public tournament URL identity (Event id — unchanged by schedule/results).
 */

export function buildPublicTournamentPath(tenantKey: string, tournamentId: string): string {
  const slug = tenantKey.trim();
  const id = tournamentId.trim();
  return `/public/${encodeURIComponent(slug)}/turniere/${encodeURIComponent(id)}`;
}

export function buildPublicTournamentApiPath(tenantKey: string, tournamentId: string): string {
  const slug = tenantKey.trim();
  const id = tournamentId.trim();
  return `/api/public/${encodeURIComponent(slug)}/website/tournaments/${encodeURIComponent(id)}`;
}
