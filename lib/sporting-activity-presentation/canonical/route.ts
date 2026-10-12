import { buildSportingActivityDetailHrefFromResourceKey } from "@/lib/sporting-activity-detail/href";
import type { SceActivityKind, SceActivityRoute } from "./types";

export function parseActivityIdFromResourceKey(resourceKey: string): string {
  const separatorIndex = resourceKey.indexOf(":");
  if (separatorIndex === -1) {
    return resourceKey;
  }
  return resourceKey.slice(separatorIndex + 1);
}

/**
 * Canonical primary navigation targets for activity cards (consume vs manage).
 * Preserves existing URL shapes — no route migration in 01C.
 */
export function buildSceActivityRoute(
  kind: SceActivityKind,
  resourceKey: string,
): SceActivityRoute {
  const activityId = parseActivityIdFromResourceKey(resourceKey);
  const consumeHref = buildSportingActivityDetailHrefFromResourceKey(resourceKey);

  let manageHref: string | null = null;
  let defaultContextTab: string | undefined;

  switch (kind) {
    case "MATCH":
      manageHref = activityId
        ? `/dashboard/matchcenter/${encodeURIComponent(activityId)}`
        : null;
      defaultContextTab = "uebersicht";
      break;
    case "TRAINING":
      manageHref = null;
      defaultContextTab = "uebersicht";
      break;
    case "TOURNAMENT":
      manageHref = activityId
        ? `/dashboard/tournamentcenter/${encodeURIComponent(activityId)}/edit`
        : null;
      defaultContextTab = "uebersicht";
      break;
    case "CLUB_EVENT":
      manageHref = activityId
        ? `/dashboard/veranstaltungen/${encodeURIComponent(activityId)}/edit`
        : null;
      defaultContextTab = "uebersicht";
      break;
  }

  return {
    resourceKey,
    consumeHref,
    manageHref,
    defaultContextTab,
  };
}
