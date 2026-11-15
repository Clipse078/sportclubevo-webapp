import { NextRequest, NextResponse } from "next/server";
import {
  loadClubStrategyAuthoring,
  upsertClubStrategyAuthoring,
} from "@/lib/club-development/club-strategy-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function GET() {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_VIEW,
    PERMISSIONS.TARGETS_MANAGE,
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const authoring = await loadClubStrategyAuthoring(access.context.actor, access.context.actorUserId);
  return NextResponse.json({ authoring });
}

export async function PUT(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  try {
    const result = await upsertClubStrategyAuthoring(access.context.actor, access.context.actorUserId, {
      situationText: body?.situationText,
      alignmentText: body?.alignmentText,
      responsiblePersonId: body?.responsiblePersonId,
      periodLabel: body?.periodLabel,
      periodStartsAt: body?.periodStartsAt,
      periodEndsAt: body?.periodEndsAt,
      nextReviewAt: body?.nextReviewAt,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("club-strategy PUT failed", error);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}