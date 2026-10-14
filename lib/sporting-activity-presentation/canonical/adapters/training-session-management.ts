import type { TrainingSessionManagementRow } from "@/lib/training/management-session-view";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { buildSceActivityRoute } from "../route";
import { resolveSceTrainingSessionDisplayStatus } from "../training-session-display-status";
import type { SceTrainingPresentationModel } from "../types";

export function resolveSceTrainingPresentationFromSessionManagementRow(
  row: TrainingSessionManagementRow,
  tenantClubName: string,
): SceTrainingPresentationModel {
  const host = tenantClubName.trim() || undefined;
  const resourceLabel = row.facilityLabel?.trim() || undefined;

  const location = buildSportingActivityLocation({
    mode: "HOME",
    hostOrOrganiser: host,
    facilityResource: resourceLabel,
  });

  return {
    kind: "TRAINING",
    activityId: row.sessionId,
    resourceKey: `training-session:${row.sessionId}`,
    typeLabel: "TRAINING",
    trainingTitle: row.seriesTitle,
    team: row.teamName ? { name: row.teamName } : undefined,
    schedule: {
      startAt: row.startAt,
      endAt: row.endAt,
      allDay: false,
    },
    schedulePresentation: { kind: "SESSION" },
    location,
    route: buildSceActivityRoute("TRAINING", `training-session:${row.sessionId}`),
    status: resolveSceTrainingSessionDisplayStatus(row),
  };
}
