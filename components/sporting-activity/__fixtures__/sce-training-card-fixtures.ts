import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { buildSceActivityRoute } from "@/lib/sporting-activity-presentation/canonical/route";
import { resolveSceTrainingManagementStatus } from "@/lib/sporting-activity-presentation/canonical/training-management-status";
import type { SceTrainingPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";

export function createSceTrainingCardFixtureSession(
  overrides: Partial<SceTrainingPresentationModel> = {},
): SceTrainingPresentationModel {
  const resourceKey = "training-session:fixture-1";
  return {
    kind: "TRAINING",
    activityId: "fixture-1",
    resourceKey,
    typeLabel: "TRAINING",
    trainingTitle: "Junioren B1 Training",
    team: { name: "Junioren B1" },
    schedule: {
      startAt: "2026-10-12T16:45:00.000Z",
      endAt: "2026-10-12T18:15:00.000Z",
    },
    schedulePresentation: { kind: "SESSION" },
    location: buildSportingActivityLocation({
      mode: "HOME",
      hostOrOrganiser: "FC Allschwil",
      venueName: "Im Brüel",
      facilityResource: "KR2",
    }),
    route: buildSceActivityRoute("TRAINING", resourceKey),
    status: resolveSceTrainingManagementStatus("ACTIVE"),
    ...overrides,
  };
}

export function createSceTrainingCardFixtureRecurring(
  overrides: Partial<SceTrainingPresentationModel> = {},
): SceTrainingPresentationModel {
  const resourceKey = "training-team-season:ts-fixture";
  return {
    kind: "TRAINING",
    activityId: "ts-fixture",
    resourceKey,
    typeLabel: "TRAINING",
    trainingTitle: "Junioren B1 Training",
    team: { name: "Junioren B1" },
    schedule: { startAt: new Date(0).toISOString(), endAt: null },
    schedulePresentation: {
      kind: "RECURRING_DEFINITION",
      recurrence: {
        weekdayShortLabels: ["Mo", "Mi", "Fr"],
        rhythmLabel: "Mo · Mi · Fr",
        timeLabel: "18:45–20:15",
      },
    },
    location: buildSportingActivityLocation({
      mode: "HOME",
      hostOrOrganiser: "FC Allschwil",
      venueName: "Im Brüel",
      facilityResource: "KR2",
    }),
    route: buildSceActivityRoute("TRAINING", resourceKey),
    status: resolveSceTrainingManagementStatus("ACTIVE"),
    ...overrides,
  };
}
