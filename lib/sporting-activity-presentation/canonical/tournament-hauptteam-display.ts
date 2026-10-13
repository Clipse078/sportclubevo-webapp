/**
 * Pure Hauptteam label for Tournament cards — strips redundant organiser club prefix
 * when the canonical team name repeats the organising club (same rules as infoboard
 * secondary team line), without mutating underlying team identity.
 */

function meaningful(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveSceTournamentHauptteamDisplayName(input: {
  readonly hauptteamName: string | null | undefined;
  readonly organiserDisplayName: string | null | undefined;
}): string | undefined {
  const name = meaningful(input.hauptteamName);
  if (!name) return undefined;

  const club = meaningful(input.organiserDisplayName);
  if (!club) return name;

  if (name.toUpperCase() === club.toUpperCase()) {
    return undefined;
  }

  const clubUpper = club.toUpperCase();
  const nameUpper = name.toUpperCase();
  if (nameUpper.startsWith(clubUpper)) {
    const stripped = name.slice(club.length).trim();
    if (stripped.length > 0) {
      return stripped;
    }
    return undefined;
  }

  return name;
}
