import { buildSportingActivityLocation } from "./location";
import type { SportingActivityPresentation } from "./types";

type TrainingSeriesIdentityInput = {
  teamSeasonId: string;
  title: string;
  facilityVenueName: string | null;
};

/** Server-side training management identity (venue/site only, not operational resource). */
export function buildTrainingManagementActivityPresentation(
  row: TrainingSeriesIdentityInput,
  tenantName: string,
): SportingActivityPresentation {
  const clubName = tenantName.trim() || undefined;
  const facilityName = row.facilityVenueName?.trim() || undefined;

  return {
    identity: {
      resourceKey: `training-team-season:${row.teamSeasonId}`,
      title: row.title,
      typeLabel: "Training",
      activityKind: "TRAINING",
    },
    schedule: {
      startAt: new Date(0).toISOString(),
      endAt: null,
    },
    location: buildSportingActivityLocation({
      mode: "HOME",
      hostOrOrganiser: clubName,
      venueName: facilityName,
    }),
  };
}
