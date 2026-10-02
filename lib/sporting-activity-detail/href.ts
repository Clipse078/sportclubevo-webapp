import { programmeResourceKey, type PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";

const SPORTING_DETAIL_SOURCE_TYPES = new Set<PersonalProgrammeSourceType>([
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
]);

/** Deep-link href for canonical Activity Detail routes. */
export function buildSportingActivityDetailHref(
  sourceType: PersonalProgrammeSourceType,
  resourceId: string,
): string | null {
  if (!SPORTING_DETAIL_SOURCE_TYPES.has(sourceType)) {
    return null;
  }
  const resourceKey = programmeResourceKey(sourceType, resourceId);
  return buildSportingActivityDetailHrefFromResourceKey(resourceKey);
}

export function buildSportingActivityDetailHrefFromResourceKey(resourceKey: string): string | null {
  if (resourceKey.startsWith("training-session:")) {
    const sessionId = resourceKey.slice("training-session:".length);
    return sessionId ? `/dashboard/activity/training-session/${encodeURIComponent(sessionId)}` : null;
  }
  if (resourceKey.startsWith("event:")) {
    const eventId = resourceKey.slice("event:".length);
    return eventId ? `/dashboard/activity/event/${encodeURIComponent(eventId)}` : null;
  }
  return null;
}

export function isSportingActivityDetailHref(href: string): boolean {
  return (
    href.startsWith("/dashboard/activity/training-session/") ||
    href.startsWith("/dashboard/activity/event/")
  );
}
