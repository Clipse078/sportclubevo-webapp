/**
 * Dashboard cockpit programme preview — stacked list-row contract (Heute & als Nächstes).
 * Scoped to /dashboard feed; Mein Programm list keeps programme-personal horizontal rows.
 */

export const SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW = "programme-dashboard-preview" as const;

export type SceProgrammeDashboardPreviewListRowPresentation =
  typeof SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW;

export function isProgrammeDashboardPreviewListRow(
  presentation: string | undefined,
): presentation is SceProgrammeDashboardPreviewListRowPresentation {
  return presentation === SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW;
}

/** External date tile; omit inline date column like programme-personal. */
export function programmeListRowOmitsInlineDateColumn(presentation: string | undefined): boolean {
  return (
    presentation === "programme-personal" ||
    isProgrammeDashboardPreviewListRow(presentation)
  );
}