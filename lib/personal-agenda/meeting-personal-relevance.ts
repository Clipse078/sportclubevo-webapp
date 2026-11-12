import type { PersonalContext } from "@/lib/dashboard/personal-context/types";
import type { PersonalMeetingAuthorizationRow } from "./meeting-projection-access";

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string");
}

export type MeetingPersonalRole = "participant" | "organizer" | "invited";

/**
 * Personal relevance for Mein Programm — not full tenant-wide meeting browse.
 * ORGANISATION-scoped meetings require participant or organiser relationship.
 */
export function resolveMeetingPersonalRole(
  meeting: PersonalMeetingAuthorizationRow,
  participantRole: "participant" | "organizer" | null,
  ctx: PersonalContext,
  personallyRelevantTeamIds: readonly string[],
): MeetingPersonalRole | null {
  if (participantRole === "participant") return "participant";
  if (participantRole === "organizer" || meeting.createdByUserId === ctx.userId) {
    return "organizer";
  }

  if (meeting.createdByUserId === ctx.userId) {
    return "organizer";
  }

  if (hasExplicitMeetingAllowlistMatch(meeting, ctx, personallyRelevantTeamIds)) {
    return "invited";
  }

  return null;
}

export function hasExplicitMeetingAllowlistMatch(
  meeting: Pick<
    PersonalMeetingAuthorizationRow,
    "visibilityScope" | "visibleUserRefs" | "visiblePersonRefs" | "visibleTeamRefs" | "visibleOrgUnitRefs"
  >,
  ctx: PersonalContext,
  personallyRelevantTeamIds: readonly string[],
): boolean {
  if (meeting.visibilityScope === "ORGANISATION") {
    return false;
  }

  const visibleUserIds = parseStringArray(meeting.visibleUserRefs);
  if (visibleUserIds.includes(ctx.userId)) {
    return true;
  }

  const visiblePersonIds = parseStringArray(meeting.visiblePersonRefs);
  if (ctx.personId && visiblePersonIds.includes(ctx.personId)) {
    return true;
  }

  const visibleTeamIds = parseStringArray(meeting.visibleTeamRefs);
  if (visibleTeamIds.some((teamId) => personallyRelevantTeamIds.includes(teamId))) {
    return true;
  }

  const visibleOrgUnitIds = parseStringArray(meeting.visibleOrgUnitRefs);
  const personalOrgUnitIds = ctx.orgUnits.map((org) => org.orgUnitId);
  if (visibleOrgUnitIds.some((orgUnitId) => personalOrgUnitIds.includes(orgUnitId))) {
    return true;
  }

  return false;
}
