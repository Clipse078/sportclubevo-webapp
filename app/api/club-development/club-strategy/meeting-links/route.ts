import { NextRequest, NextResponse } from "next/server";
import { parseEntityRefs } from "@/lib/linking/helpers";
import { replaceClubStrategyMeetingRefs } from "@/lib/club-development/club-strategy-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function PATCH(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const meetingRefs = parseEntityRefs(body?.meetingRefs ?? []);
  if (meetingRefs.length === 0 && body?.meetingRefs !== undefined && !Array.isArray(body.meetingRefs)) {
    return NextResponse.json({ error: "Ungültiger Anfrage-Body." }, { status: 400 });
  }

  try {
    await replaceClubStrategyMeetingRefs(access.context.actor, access.context.actorUserId, meetingRefs);
    return NextResponse.json({ ok: true, meetingRefs });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MEETING_NOT_FOUND:")) {
      const slug = error.message.split(":")[1];
      return NextResponse.json({ error: `Meeting nicht gefunden: ${slug}` }, { status: 400 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Verknüpfungen konnten nicht gespeichert werden." }, { status: 500 });
  }
}