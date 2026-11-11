import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { MeetingStatus } from "@prisma/client";
import { getMeetings } from "@/lib/meetings/queries";
import { createMeetingParticipantsFromPersonIds } from "@/lib/meetings/meeting-participant-create";
import { resolveMeetingVisibilityOnCreate } from "@/lib/meetings/meeting-visibility-payload";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function GET() {
  const access = await requireStrategicApiContext([
    PERMISSIONS.MEETINGS_VIEW,
    PERMISSIONS.MEETINGS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const meetings = await getMeetings(access.context.actor);
  return NextResponse.json({ meetings });
}

export async function POST(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.MEETINGS_MANAGE]);
  if (!access.ok) return access.response;
  const { actor, tenantId } = access.context;

  try {
    const body = await request.json().catch(() => ({}));

    const title = (body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
    }

    const rawDate = body?.meetingDate;
    if (!rawDate) {
      return NextResponse.json({ error: "Datum ist erforderlich." }, { status: 400 });
    }

    const meetingDate = new Date(rawDate);
    if (isNaN(meetingDate.getTime())) {
      return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
    }

    const rawSlug = (body?.slug ?? "").trim();
    const slug = rawSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const existing = await prisma.meeting.findFirst({
      where: { slug, tenantId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: `Slug "${slug}" ist bereits vergeben.` }, { status: 409 });
    }

    const validStatuses = Object.values(MeetingStatus);
    const status: MeetingStatus = validStatuses.includes(body?.status as MeetingStatus)
      ? (body.status as MeetingStatus)
      : MeetingStatus.PLANNED;

    const visibilityResolved = await resolveMeetingVisibilityOnCreate(tenantId, body);
    if (!visibilityResolved.ok) {
      return NextResponse.json({ error: visibilityResolved.error }, { status: 400 });
    }
    const { visibilityScope, allowlists } = visibilityResolved.payload;

    const created = await prisma.meeting.create({
      data: {
        tenantId,
        slug,
        title,
        description: body?.description?.trim() || null,
        meetingDate,
        location: body?.location?.trim() || null,
        attendeeCount: null,
        plannedDurationMin:
          body?.plannedDurationMin !== undefined && body?.plannedDurationMin !== null && body?.plannedDurationMin !== ""
            ? Math.max(0, Math.trunc(Number(body.plannedDurationMin))) || null
            : null,
        status,
        visibilityScope,
        createdByUserId: actor.userId,
        visibleOrgUnitRefs: allowlists.visibleOrgUnitRefs,
        visibleRoleRefs: allowlists.visibleRoleRefs,
        visibleUserRefs: allowlists.visibleUserRefs,
        visibleTargetGroupRefs: allowlists.visibleTargetGroupRefs,
        visibleTeamRefs: allowlists.visibleTeamRefs,
        visiblePersonRefs: allowlists.visiblePersonRefs,
      },
      select: { id: true, slug: true, title: true },
    });

    await createMeetingParticipantsFromPersonIds({
      tenantId,
      meetingId: created.id,
      personIds: body?.participantPersonIds,
    });

    return NextResponse.json({ meeting: created }, { status: 201 });
  } catch (error) {
    console.error("Create meeting failed:", error);
    return NextResponse.json({ error: "Meeting konnte nicht erstellt werden." }, { status: 500 });
  }
}
