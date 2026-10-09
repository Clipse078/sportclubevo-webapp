/** Shape returned by GET /api/teams (see app/api/teams/route.ts). */
export type TeamsListApiItem = {
  id: string;
  name: string;
  isActive?: boolean;
  activeSeason?: { displayName?: string | null } | null;
};

export type TeamSelectOption = { id: string; name: string };

/**
 * Normalizes GET /api/teams JSON into club-facing select options.
 * Accepts the canonical bare array or legacy `{ teams: [...] }` wrappers.
 */
export function parseTeamsListApiResponse(data: unknown): TeamSelectOption[] {
  const raw: unknown[] = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { teams?: unknown }).teams)
      ? ((data as { teams: unknown[] }).teams ?? [])
      : [];

  return raw
    .filter((item): item is TeamsListApiItem => {
      return (
        item !== null &&
        typeof item === "object" &&
        typeof (item as TeamsListApiItem).id === "string" &&
        typeof (item as TeamsListApiItem).name === "string"
      );
    })
    .filter((team) => team.isActive !== false)
    .map((team) => ({
      id: team.id,
      name: team.activeSeason?.displayName?.trim() || team.name,
    }));
}
