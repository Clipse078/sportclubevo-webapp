import { resolveCanonicalPitchPresentationLabel } from "@/lib/publishing/presentation/canonical-pitch-presentation";

export type TournamentResourceRow = {
  code: string;
  name: string;
  facilityName: string;
  resourceType: string;
  displayOrder: number;
};

export function formatTournamentResourceLabels(rows: readonly TournamentResourceRow[]): string | null {
  if (rows.length === 0) return null;
  const labels = rows
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((row) =>
      resolveCanonicalPitchPresentationLabel({
        code: row.code,
        name: row.name,
        facilityName: row.facilityName,
        resourceType:
          row.resourceType === "HALF_PITCH"
            ? "HALF_PITCH"
            : row.resourceType === "FULL_PITCH"
              ? "FULL_PITCH"
              : "OTHER",
      }),
    )
    .filter((label): label is string => Boolean(label?.trim()));
  if (labels.length === 0) return null;
  return labels.join(" · ");
}

export function formatTournamentPlayableVenueLabel(input: {
  location: string | null | undefined;
  resourceLabel: string | null | undefined;
}): string | null {
  const location = input.location?.trim() || null;
  const resource = input.resourceLabel?.trim() || null;
  if (location && resource) return `${location} · ${resource}`;
  return location ?? resource;
}
