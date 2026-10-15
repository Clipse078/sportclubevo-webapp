import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import { buildSceActivityRoute } from "../route";
import { buildSceActivityPresentationStatus } from "../status";
import type { SceTrainingPresentationModel } from "../types";
import { parseActivityIdFromResourceKey } from "../route";

export function resolveSceTrainingPresentationFromLegacy(
  presentation: SportingActivityPresentation,
): SceTrainingPresentationModel {
  if (presentation.identity.activityKind !== "TRAINING") {
    throw new Error("resolveSceTrainingPresentationFromLegacy: expected TRAINING");
  }

  const resourceKey = presentation.identity.resourceKey;
  const activityId = parseActivityIdFromResourceKey(resourceKey);

  return {
    kind: "TRAINING",
    activityId,
    resourceKey,
    typeLabel: presentation.identity.typeLabel,
    trainingTitle: presentation.identity.title,
    team: presentation.team?.name ? { name: presentation.team.name } : undefined,
    schedule: { ...presentation.schedule },
    schedulePresentation: { kind: "SESSION" },
    location: { ...presentation.location },
    route: buildSceActivityRoute("TRAINING", resourceKey),
    dressingRoom: presentation.dressingRoomLabel?.trim()
      ? { label: presentation.dressingRoomLabel.trim() }
      : undefined,
    status: presentation.status
      ? buildSceActivityPresentationStatus({ domain: presentation.status })
      : undefined,
  };
}
