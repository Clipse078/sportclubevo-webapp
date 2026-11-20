import { NextRequest, NextResponse } from "next/server";
import {
  addClubStrategyFocusTarget,
  removeClubStrategyFocusTarget,
} from "@/lib/club-development/club-strategy-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function POST(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : "";
  const clubStrategyId =
    typeof body?.clubStrategyId === "string"
      ? body.clubStrategyId
      : typeof body?.strategyId === "string"
        ? body.strategyId
        : null;
  if (!targetId) {
    return NextResponse.json({ error: "targetId ist erforderlich." }, { status: 400 });
  }

  try {
    await addClubStrategyFocusTarget(
      access.context.actor,
      access.context.actorUserId,
      targetId,
      clubStrategyId,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "TARGET_FORBIDDEN") {
      return NextResponse.json({ error: "Ziel nicht sichtbar." }, { status: 404 });
    }
    return NextResponse.json({ error: "Verknüpfung fehlgeschlagen." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;

  const targetId = request.nextUrl.searchParams.get("targetId")?.trim() ?? "";
  const clubStrategyId =
    request.nextUrl.searchParams.get("clubStrategyId")?.trim() ??
    request.nextUrl.searchParams.get("strategyId")?.trim() ??
    null;
  if (!targetId) {
    return NextResponse.json({ error: "targetId ist erforderlich." }, { status: 400 });
  }

  try {
    await removeClubStrategyFocusTarget(
      access.context.actor,
      access.context.actorUserId,
      targetId,
      clubStrategyId,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Entfernen fehlgeschlagen." }, { status: 500 });
  }
}