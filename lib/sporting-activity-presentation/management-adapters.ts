import type { TrainingSeriesManagementRow } from "@/lib/training/management-series-view";
import { buildTrainingManagementActivityPresentation } from "./management-training-presentation";

export { buildTrainingManagementActivityPresentation } from "./management-training-presentation";

export function attachTrainingManagementActivityPresentations(
  rows: readonly TrainingSeriesManagementRow[],
  tenantName: string,
): TrainingSeriesManagementRow[] {
  return rows.map((row) => ({
    ...row,
    activityPresentation: buildTrainingManagementActivityPresentation(
      {
        teamSeasonId: row.teamSeasonId,
        title: row.title,
        facilityVenueName: row.facilityVenueName,
      },
      tenantName,
    ),
  }));
}
