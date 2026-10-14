import { resolveSceTournamentHauptteamDisplayName } from "./tournament-hauptteam-display";

function normalizeOwnTeamLabel(
  rawName: string,
  organiserDisplayName: string | null | undefined,
): string {
  return (
    resolveSceTournamentHauptteamDisplayName({
      hauptteamName: rawName,
      organiserDisplayName,
    }) ?? rawName.trim()
  );
}

/**
 * Compact own-team line for Tournament MICRO / list-row (0:n SCE teams).
 */
export function formatSceTournamentOwnTeamsCompactLabel(input: {
  teamNames: readonly string[] | undefined;
  organiserDisplayName: string | null | undefined;
}): string | undefined {
  const organiser = input.organiserDisplayName?.trim();
  const raw = (input.teamNames ?? [])
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  if (raw.length === 0) {
    return undefined;
  }

  const labels = raw.map((name) => normalizeOwnTeamLabel(name, organiser));
  const unique = [...new Set(labels)];
  if (unique.length === 0) {
    return undefined;
  }
  if (unique.length === 1) {
    return unique[0];
  }
  if (unique.length === 2) {
    return `${unique[0]} · ${unique[1]}`;
  }
  return `${unique[0]} · +${unique.length - 1} Teams`;
}
