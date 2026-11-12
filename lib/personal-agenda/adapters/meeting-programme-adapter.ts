import { VisibilityScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getPersonallyRelevantTeamIds } from "@/lib/dashboard/personal-context";
import {
  meetingOrganizerContextLabel,
  meetingParticipantContextLabel,
} from "@/lib/dashboard/personal-context";
import type { PersonalProgrammeAdapterContext } from "@/lib/dashboard/personal-context/programme-adapter-contract";
import { resolveSceMeetingPresentationFromProgramme } from "@/lib/sporting-activity-presentation/canonical/adapters/meeting-programme";
import {
  canIncludeMeetingInPersonalProgramme,
  type PersonalMeetingProjectionActor,
} from "../meeting-projection-access";
import { resolveMeetingPersonalRole, type MeetingPersonalRole } from "../meeting-personal-relevance";
import { programmeResourceKey, type PersonalProgrammeItem } from "../personal-programme-types";
import { normalizeMeetingProgrammeStatus } from "../programme-status";

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
  plannedDurationMin: true,
} as const;

type MeetingRow = {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  meetingDate: Date;
  location: string | null;
  status: string;
  visibilityScope: string;
  createdByUserId: string | null;
  visibleRoleRefs: unknown;
  visibleUserRefs: unknown;
  visibleTeamRefs: unknown;
  visibleOrgUnitRefs: unknown;
  visiblePersonRefs: unknown;
  visibleTargetGroupRefs?: unknown;
  plannedDurationMin: number | null;
};

function buildMeetingActor(ctx: PersonalProgrammeAdapterContext): PersonalMeetingProjectionActor {
  return {
    userId: ctx.personal.userId,
    tenantId: ctx.personal.tenantId,
    permissionKeys: ctx.permissionKeys,
    orgUnitIds: ctx.personal.orgUnits.map((org) => org.orgUnitId),
    roleKeys: [],
  };
}

function participantRelationFilter(ctx: PersonalProgrammeAdapterContext) {
  const { userId, personId } = ctx.personal;
  if (personId) {
    return {
      some: {
        OR: [{ userId }, { personId }],
      },
    };
  }
  return { some: { userId } };
}

function contextLabelForRole(role: MeetingPersonalRole): string {
  const participantLabel = meetingParticipantContextLabel().label;
  const organizerLabel = meetingOrganizerContextLabel().label;
  if (role === "participant") return participantLabel;
  if (role === "organizer") return organizerLabel;
  return "Meeting · Einladung";
}

function meetingRowToProgrammeItem(
  meeting: MeetingRow,
  role: MeetingPersonalRole,
): PersonalProgrammeItem {
  const sourceType = "MEETING" as const;
  const contextLabel = contextLabelForRole(role);
  const status = normalizeMeetingProgrammeStatus(meeting.status);
  const canonicalPresentation = resolveSceMeetingPresentationFromProgramme({
    meetingId: meeting.id,
    slug: meeting.slug,
    title: meeting.title,
    meetingDate: meeting.meetingDate,
    location: meeting.location,
    contextLabel,
    status,
    plannedDurationMin: meeting.plannedDurationMin,
  });

  return {
    id: programmeResourceKey(sourceType, meeting.id),
    sourceType,
    startsAt: meeting.meetingDate,
    endsAt: canonicalPresentation.schedule.endAt
      ? new Date(canonicalPresentation.schedule.endAt)
      : null,
    title: meeting.title,
    contextLabel,
    venue: meeting.location?.trim() || undefined,
    status,
    deepLink: `/vereinsleitung/meetings/${meeting.slug}`,
    typeLabel: "Meeting",
    eventType: "MEETING",
    ariaLabel: `Meeting: ${meeting.title}`,
    canonicalPresentation,
  };
}

export async function loadMeetingProgrammeItems(
  ctx: PersonalProgrammeAdapterContext,
): Promise<PersonalProgrammeItem[]> {
  const userId = ctx.personal.userId;
  if (!userId) {
    return [];
  }

  const actor = buildMeetingActor(ctx);
  const personallyRelevantTeamIds = getPersonallyRelevantTeamIds(ctx.personal);

  const rangeWhere = {
    gte: ctx.rangeStart,
    lte: ctx.rangeEnd,
  };

  const [participantMeetings, organizerMeetings, visibilityScopedMeetings] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        tenantId: ctx.personal.tenantId,
        status: "PLANNED",
        meetingDate: rangeWhere,
        participants: participantRelationFilter(ctx),
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
    prisma.meeting.findMany({
      where: {
        tenantId: ctx.personal.tenantId,
        status: "PLANNED",
        meetingDate: rangeWhere,
        visibilityScope: {
          in: [VisibilityScope.RESTRICTED, VisibilityScope.PRIVATE],
        },
      },
      orderBy: { meetingDate: "asc" },
      select: meetingSelect,
    }),
  ]);

  const byId = new Map<
    string,
    { meeting: MeetingRow; role: "participant" | "organizer" | null }
  >();

  for (const meeting of participantMeetings) {
    byId.set(meeting.id, { meeting, role: "participant" });
  }
  for (const meeting of organizerMeetings) {
    const existing = byId.get(meeting.id);
    if (existing?.role === "participant") continue;
    byId.set(meeting.id, { meeting, role: "organizer" });
  }
  for (const meeting of visibilityScopedMeetings) {
    if (!byId.has(meeting.id)) {
      byId.set(meeting.id, { meeting, role: null });
    }
  }

  const items: PersonalProgrammeItem[] = [];

  for (const { meeting, role: participantOrOrganizer } of byId.values()) {
    if (!canIncludeMeetingInPersonalProgramme(actor, meeting)) {
      continue;
    }

    const personalRole = resolveMeetingPersonalRole(
      meeting,
      participantOrOrganizer,
      ctx.personal,
      personallyRelevantTeamIds,
    );
    if (!personalRole) {
      continue;
    }

    items.push(meetingRowToProgrammeItem(meeting, personalRole));
  }

  return items;
}
