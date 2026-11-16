/**
 * Dashboard cockpit programme preview — stacked list-row contract (Heute & als Nächstes).
 * Scoped to /dashboard feed; Mein Programm list keeps programme-personal horizontal rows.
 */

export const SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW = "programme-dashboard-preview" as const;

/** Inline-size container queried by dashboard preview card bodies. */
export const SCE_PROGRAMME_DASHBOARD_PREVIEW_CONTAINER_NAME = "sce-programme-dashboard-preview";

/** Minimum card content width before club identity reserves the top-right column. */
export const SCE_PROGRAMME_DASHBOARD_PREVIEW_WIDE_MIN_WIDTH = "22rem";

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