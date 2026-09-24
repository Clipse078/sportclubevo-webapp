import { prisma } from "@/lib/db/prisma";
import {
  meetingOrganizerContextLabel,
  meetingParticipantContextLabel,
} from "@/lib/dashboard/personal-context";
import type { PersonalProgrammeAdapterContext } from "@/lib/dashboard/personal-context/programme-adapter-contract";
import {
  canIncludeMeetingInPersonalProgramme,
  type PersonalMeetingProjectionActor,
} from "../meeting-projection-access";
import { programmeResourceKey, type PersonalProgrammeItem } from "../personal-programme-types";
import { normalizeMeetingProgrammeStatus } from "../programme-status";

export async function loadMeetingProgrammeItems(
  ctx: PersonalProgrammeAdapterContext,
): Promise<PersonalProgrammeItem[]> {
  const userId = ctx.personal.userId;
  if (!userId) {
    return [];
  }

  const actor: PersonalMeetingProjectionActor = {
    userId,
    tenantId: ctx.personal.tenantId,
    permissionKeys: ctx.permissionKeys,
  };

  const rangeWhere = {
    gte: ctx.rangeStart,
    lte: ctx.rangeEnd,
  };

  const meetingSelect = {
    id: true,
    tenantId: true,
    slug: true,
    title: true,
    meetingDate: true,
    location: true,
    status: true,
    visibilityScope: true,
    createdByUserId: true,
    visibleRoleRefs: true,
    visibleUserRefs: true,
    visibleTeamRefs: true,
    visibleOrgUnitRefs: true,
    visiblePersonRefs: true,
    visibleTargetGroupRefs: true,
  } as const;

  const [participantMeetings, organizerMeetings] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        tenantId: ctx.personal.tenantId,
        status: "PLANNED",
        meetingDate: rangeWhere,
        participants: { some: { userId } },
      },
      orderBy: { meetingDate: "asc" },
      select: meetingSelect,
    }),
    prisma.meeting.findMany({
      where: {
        tenantId: ctx.personal.tenantId,
        status: "PLANNED",
        meetingDate: rangeWhere,
        createdByUserId: userId,
      },
      orderBy: { meetingDate: "asc" },
      select: meetingSelect,
    }),
  ]);

  const participantLabel = meetingParticipantContextLabel().label;
  const organizerLabel = meetingOrganizerContextLabel().label;

  const byId = new Map<
    string,
    { meeting: (typeof participantMeetings)[number]; role: "participant" | "organizer" }
  >();

  for (const meeting of participantMeetings) {
    byId.set(meeting.id, { meeting, role: "participant" });
  }
  for (const meeting of organizerMeetings) {
    const existing = byId.get(meeting.id);
    if (existing) {
      if (existing.role === "participant") continue;
    }
    byId.set(meeting.id, { meeting, role: "organizer" });
  }

  const items: PersonalProgrammeItem[] = [];

  for (const { meeting, role } of byId.values()) {
    if (!canIncludeMeetingInPersonalProgramme(actor, meeting)) {
      continue;
    }

    const sourceType = "MEETING" as const;
    const contextLabel = role === "organizer" ? organizerLabel : participantLabel;

    items.push({
      id: programmeResourceKey(sourceType, meeting.id),
      sourceType,
      startsAt: meeting.meetingDate,
      endsAt: null,
      title: meeting.title,
      contextLabel,
      venue: meeting.location?.trim() || undefined,
      status: normalizeMeetingProgrammeStatus(meeting.status),
      deepLink: `/vereinsleitung/meetings/${meeting.slug}`,
      typeLabel: "Meeting",
      eventType: "MEETING",
      ariaLabel: `Meeting: ${meeting.title}`,
    });
  }

  return items;
}
