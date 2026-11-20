import { NextRequest, NextResponse } from "next/server";
import { parseEntityRefs } from "@/lib/linking/helpers";
import { replaceClubStrategyAssociationRefs } from "@/lib/club-development/club-strategy-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function PATCH(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const meetingRefsRaw = body?.meetingRefs;
  const decisionRefsRaw = body?.decisionRefs;
  if (meetingRefsRaw !== undefined && !Array.isArray(meetingRefsRaw)) {
    return NextResponse.json({ error: "Ungültiger Anfrage-Body." }, { status: 400 });
  }
  if (decisionRefsRaw !== undefined && !Array.isArray(decisionRefsRaw)) {
    return NextResponse.json({ error: "Ungültiger Anfrage-Body." }, { status: 400 });
  }

  const meetingRefs = meetingRefsRaw === undefined ? undefined : parseEntityRefs(meetingRefsRaw);
  const decisionRefs = decisionRefsRaw === undefined ? undefined : parseEntityRefs(decisionRefsRaw);

  try {
    await replaceClubStrategyAssociationRefs(access.context.actor, access.context.actorUserId, {
      clubStrategyId:
        typeof body?.clubStrategyId === "string"
          ? body.clubStrategyId
          : typeof body?.strategyId === "string"
            ? body.strategyId
            : null,
      meetingRefs,
      decisionRefs,
    });
    return NextResponse.json({ ok: true, meetingRefs: meetingRefs ?? [], decisionRefs: decisionRefs ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MEETING_NOT_FOUND:")) {
      const slug = error.message.split(":")[1];
      return NextResponse.json({ error: `Meeting nicht gefunden: ${slug}` }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith("DECISION_NOT_FOUND:")) {
      const id = error.message.split(":")[1];
      return NextResponse.json({ error: `Beschluss nicht gefunden: ${id}` }, { status: 400 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Verknüpfungen konnten nicht gespeichert werden." }, { status: 500 });
  }
}