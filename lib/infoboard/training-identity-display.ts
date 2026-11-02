/**
 * Training activity primary/secondary identity (R6 no-clip, R11 venue signage).
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

/** R11 — crest-left horizontal rows; team-first for tenant-prefixed labels. */
export const R11_TRAINING_IDENTITY_HORIZONTAL = true as const;

/**
 * Venue training identity: prefer `[crest] TEAM` for tenant-prefixed labels.
 * Use club + team lines only when the label is exactly the club or needs differentiation.
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
      return { primary: stripped, secondary: null };
    }
  }

  return { primary: label, secondary: null };
}

/**
 * When canonical data encodes a non-tenant club prefix, keep club + team stack.
 */
export function resolveTrainingIdentityLinesWithClubStack(
  teamDisplayName: string | null | undefined,
  tenantClubName: string | null | undefined,
): TrainingIdentityLines {
  const label = meaningful(teamDisplayName);
  if (!label) return { primary: "", secondary: null };

  const club = meaningful(tenantClubName);
  if (!club) return { primary: label, secondary: null };

  const clubUpper = club.toUpperCase();
  const labelUpper = label.toUpperCase();
  if (labelUpper.startsWith(clubUpper)) {
    const stripped = label.slice(club.length).trim();
    if (stripped.length > 0) {
      return { primary: club, secondary: stripped };
    }
  }

  return resolveTrainingIdentityLines(teamDisplayName, tenantClubName);
}
