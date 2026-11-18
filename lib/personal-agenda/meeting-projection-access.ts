import { PERMISSIONS } from "@/lib/permissions/permissions";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";

export type PersonalMeetingProjectionActor = {
  userId: string;
  tenantId: string;
  permissionKeys: string[];
  orgUnitIds?: string[];
  roleKeys?: string[];
};

export type PersonalMeetingAuthorizationRow = {
  id: string;
  tenantId: string;
  status: string;
  visibilityScope: string;
  createdByUserId: string | null;
  visibleRoleRefs: unknown;
  visibleUserRefs: unknown;
  visibleTeamRefs: unknown;
  visibleOrgUnitRefs: unknown;
  visiblePersonRefs: unknown;
  visibleTargetGroupRefs?: unknown;
};

function hasAnyPermission(actor: PersonalMeetingProjectionActor, keys: string[]): boolean {
  return keys.some((k) => actor.permissionKeys.includes(k));
}

export function actorContextFromMeetingProjectionActor(
  actor: PersonalMeetingProjectionActor,
): ActorContext {
  return {
    userId: actor.userId,
    tenantId: actor.tenantId,
    permissionKeys: actor.permissionKeys,
    roleKeys: actor.roleKeys ?? [],
    orgUnitIds: actor.orgUnitIds ?? [],
    targetGroupIds: [],
  };
}

/**
 * Personal programme meeting visibility (authorization layer).
 * Call only after participant or organiser personal relevance is established.
 */
export function canIncludeMeetingInPersonalProgramme(
  actor: PersonalMeetingProjectionActor,
  meeting: PersonalMeetingAuthorizationRow,
): boolean {
  return canIncludeMeetingInPersonalProgrammeForActor(
    actorContextFromMeetingProjectionActor(actor),
    meeting,
  );
}

/**
 * Canonical meeting programme gate — same ActorContext shape as list/detail loaders.
 */
export function canIncludeMeetingInPersonalProgrammeForActor(
  actor: ActorContext,
  meeting: PersonalMeetingAuthorizationRow,
): boolean {
  if (!actor.tenantId || meeting.tenantId !== actor.tenantId) {
    return false;
  }
  const meetingPermissionKeys = new Set<string>([
    PERMISSIONS.MEETINGS_VIEW,
    PERMISSIONS.MEETINGS_MANAGE,
  ]);
  if (!actor.permissionKeys.some((key) => meetingPermissionKeys.has(key))) {
    return false;
  }
  return canSeeMeeting(meeting, actor);
}

const MEETING_DEEP_LINK_PREFIX = "/vereinsleitung/meetings/";

function meetingSlugFromProgrammeDeepLink(deepLink: string | undefined): string | null {
  if (!deepLink?.startsWith(MEETING_DEEP_LINK_PREFIX)) return null;
  const slug = deepLink.slice(MEETING_DEEP_LINK_PREFIX.length).split(/[?#]/)[0]?.trim();
  return slug || null;
}

/**
 * Fail-closed filter for cached dashboard programme rows — prevents stale meeting cards
 * from leaking metadata when visibility or org scope changes after projection rebuild.
 */
export async function filterMeetingProgrammeItemsForLiveActor(
  items: PersonalProgrammeItem[],
  actor: ActorContext,
): Promise<PersonalProgrammeItem[]> {
  if (!actor.tenantId) return items.filter((item) => item.sourceType !== "MEETING");
  const meetingItems = items.filter((item) => item.sourceType === "MEETING");
  if (meetingItems.length === 0) return items;

  const slugByItemId = new Map<string, string>();
  for (const item of meetingItems) {
    const slug = meetingSlugFromProgrammeDeepLink(item.deepLink);
    if (slug) slugByItemId.set(item.id, slug);
  }
  const slugs = [...new Set(slugByItemId.values())];
  if (slugs.length === 0) {
    return items.filter((item) => item.sourceType !== "MEETING");
  }

  const rows = await prisma.meeting.findMany({
    where: { tenantId: actor.tenantId, slug: { in: slugs } },
    select: {
      slug: true,
      tenantId: true,
      status: true,
      visibilityScope: true,
      createdByUserId: true,
      visibleRoleRefs: true,
      visibleUserRefs: true,
      visibleTeamRefs: true,
      visibleOrgUnitRefs: true,
      visiblePersonRefs: true,
      visibleTargetGroupRefs: true,
    },
  });
  const rowBySlug = new Map(rows.map((row) => [row.slug, row]));

  const allowedMeetingIds = new Set<string>();
  for (const item of meetingItems) {
    const slug = slugByItemId.get(item.id);
    const row = slug ? rowBySlug.get(slug) : undefined;
    if (row && canIncludeMeetingInPersonalProgrammeForActor(actor, { ...row, id: item.id })) {
      allowedMeetingIds.add(item.id);
    }
  }

  return items.filter((item) => item.sourceType !== "MEETING" || allowedMeetingIds.has(item.id));
}
