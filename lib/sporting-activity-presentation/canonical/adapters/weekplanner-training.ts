import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";
import { buildSceActivityRoute } from "../route";
import type { SceTrainingPresentationModel } from "../types";

export type ResolveSceTrainingFromWeekplannerOptions = {
  tenantClubName?: string | null;
};

export function resolveSceTrainingPresentationFromWeekplannerTraining(
  item: WeekplannerTrainingItem,
  options: ResolveSceTrainingFromWeekplannerOptions = {},
): SceTrainingPresentationModel {
  const resourceKey = `training-session:${item.trainingSessionId}`;
  const pitchLabel =
    item.pitchAllocations[0]?.name?.trim() ||
    item.canonicalPitchAllocations[0]?.name?.trim() ||
    undefined;

  const host = options.tenantClubName?.trim() || undefined;
  const teamName = item.teamNames[0]?.trim() || undefined;

  const location = buildSportingActivityLocation({
    mode: "HOME",
    hostOrOrganiser: host,
    venueName: item.pitchAllocations[0]?.facilityName?.trim() || undefined,
    facilityResource: pitchLabel,
  });

  return {
    kind: "TRAINING",
    activityId: item.trainingSessionId,
    resourceKey,
    typeLabel: "TRAINING",
    trainingTitle: item.title,
    team: teamName ? { name: teamName } : undefined,
    schedule: {
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      allDay: false,
    },
    schedulePresentation: { kind: "SESSION" },
    location,
    route: buildSceActivityRoute("TRAINING", resourceKey),
  };
}
