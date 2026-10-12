import type { TrainingSeriesManagementRow } from "@/lib/training/management-series-view";
import { MANAGEMENT_WEEKDAY_SHORT } from "@/lib/training/management-series-view";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { buildSceActivityRoute } from "../route";
import { resolveSceTrainingManagementStatus } from "../training-management-status";
import type { SceTrainingPresentationModel } from "../types";

export function resolveSceTrainingPresentationFromManagementRow(
  row: Pick<
    TrainingSeriesManagementRow,
    | "teamSeasonId"
    | "title"
    | "teamDisplayName"
    | "weekdays"
    | "rhythmLabel"
    | "timeLabel"
    | "timeDetailLines"
    | "facilityVenueName"
    | "facilityResourceLabel"
    | "status"
  >,
  tenantName: string,
): SceTrainingPresentationModel {
  const resourceKey = `training-team-season:${row.teamSeasonId}`;
  const clubName = tenantName.trim() || undefined;

  const location = buildSportingActivityLocation({
    mode: "HOME",
    hostOrOrganiser: clubName,
    venueName: row.facilityVenueName?.trim() || undefined,
    facilityResource: row.facilityResourceLabel?.trim() || undefined,
  });

  const weekdayShortLabels = row.weekdays.map((day) => MANAGEMENT_WEEKDAY_SHORT[day]);

  return {
    kind: "TRAINING",
    activityId: row.teamSeasonId,
    resourceKey,
    typeLabel: "TRAINING",
    trainingTitle: row.title,
    team: row.teamDisplayName ? { name: row.teamDisplayName } : undefined,
    schedule: {
      startAt: new Date(0).toISOString(),
      endAt: null,
    },
    schedulePresentation: {
      kind: "RECURRING_DEFINITION",
      recurrence: {
        weekdayShortLabels,
        rhythmLabel: row.rhythmLabel,
        timeLabel: row.timeLabel,
        timeDetailLines: row.timeDetailLines,
      },
    },
    location,
    route: buildSceActivityRoute("TRAINING", resourceKey),
    status: resolveSceTrainingManagementStatus(row.status),
  };
}
