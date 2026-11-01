/**
 * Training activity primary/secondary identity (R6 no-clip contract).
 */

function meaningful(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type TrainingIdentityLines = {
  readonly primary: string;
  readonly secondary: string | null;
};

/**
 * Splits a training label into club + team lines when tenant club name is known.
 * Falls back to a single primary line when no safe split exists.
 */
export function resolveTrainingIdentityLines(
  teamDisplayName: string | null | undefined,
  tenantClubName: string | null | undefined,
): TrainingIdentityLines {
  const label = meaningful(teamDisplayName);
  if (!label) return { primary: "", secondary: null };

  const club = meaningful(tenantClubName);
  if (!club) return { primary: label, secondary: null };

  const clubUpper = club.toUpperCase();
  const labelUpper = label.toUpperCase();
  if (labelUpper === clubUpper) {
    return { primary: label, secondary: null };
  }
  if (labelUpper.startsWith(clubUpper)) {
    const stripped = label.slice(club.length).trim();
    if (stripped.length > 0) {
      return { primary: club, secondary: stripped };
    }
  }

  return { primary: label, secondary: null };
}
