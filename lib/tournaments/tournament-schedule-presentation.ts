/**
 * TURNIERE-UX-01C — schedule display helpers for tournament create/edit (pure, no I/O).
 */

/** Subtle label for tenant/platform standard tournament duration (not editable). */
export function formatConfiguredTournamentDurationLabel(durationMinutes: number): string {
  return `${durationMinutes} Min.`;
}

export const FACILITIES_ZEITSTANDARDS_HREF = "/dashboard/admin/facilities#zeitstandards" as const;
