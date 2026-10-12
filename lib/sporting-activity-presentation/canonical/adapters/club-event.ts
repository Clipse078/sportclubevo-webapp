import { buildNameOnlyClubIdentity } from "@/lib/sporting-activity-design";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import { buildSceActivityRoute, parseActivityIdFromResourceKey } from "../route";
import { buildSceActivityPresentationStatus } from "../status";
import type { SceClubEventPresentationModel } from "../types";

export function resolveSceClubEventPresentationFromLegacy(
  presentation: SportingActivityPresentation,
  options: { organiserDisplayName?: string | null } = {},
): SceClubEventPresentationModel {
  const kind = presentation.identity.activityKind;
  if (kind !== "EVENT") {
    throw new Error("resolveSceClubEventPresentationFromLegacy: expected EVENT activity kind");
  }

  const resourceKey = presentation.identity.resourceKey;
  const organiserName =
    options.organiserDisplayName?.trim() ||
    presentation.context?.organiser?.trim() ||
    presentation.location.hostOrOrganiser?.trim();

  return {
    kind: "CLUB_EVENT",
    activityId: parseActivityIdFromResourceKey(resourceKey),
    resourceKey,
    typeLabel: presentation.identity.typeLabel,
    eventTitle: presentation.identity.title,
    organiser: organiserName ? buildNameOnlyClubIdentity(organiserName) : undefined,
    schedule: { ...presentation.schedule },
    location: { ...presentation.location },
    route: buildSceActivityRoute("CLUB_EVENT", resourceKey),
    status: presentation.status
      ? buildSceActivityPresentationStatus({ domain: presentation.status })
      : undefined,
  };
}
