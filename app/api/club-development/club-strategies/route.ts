import { NextRequest, NextResponse } from "next/server";
import {
  createClubStrategy,
  listClubStrategies,
  replaceClubStrategyOrgUnitAssignments,
} from "@/lib/club-development/club-strategy-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function GET(request: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_VIEW,
    PERMISSIONS.TARGETS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const orgUnitId = request.nextUrl.searchParams.get("orgEinheit")?.trim() ?? null;
  const strategies = await listClubStrategies(access.context.actor, { orgUnitId });
  return NextResponse.json({ strategies });
}

export async function POST(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const orgUnitIds = Array.isArray(body?.orgUnitIds)
    ? body.orgUnitIds
        .filter((v: unknown): v is string => typeof v === "string")
        .map((id: string) => id.trim())
    : [];
  const scopeClubWide = body?.scopeClubWide === true;

  if (!title) {
    return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  }

  try {
    const situationText =
      typeof body?.situationText === "string" ? body.situationText : null;
    const responsibleUserId =
      typeof body?.responsibleUserId === "string" ? body.responsibleUserId.trim() : null;
    const nextReviewAt =
      typeof body?.nextReviewAt === "string" ? body.nextReviewAt.trim() : null;

    const created = await createClubStrategy(access.context.actor, access.context.actorUserId, {
      title,
      scopeClubWide,
      orgUnitIds,
      situationText,
      responsibleUserId,
      nextReviewAt,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "ORG_UNIT_NOT_FOUND") {
      return NextResponse.json({ error: "Org-Einheit nicht gefunden." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ORG_SCOPE_REQUIRED") {
      return NextResponse.json(
        { error: "Wählen Sie mindestens eine Org-Einheit aus." },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "ORG_UNIT_FORBIDDEN") {
      return NextResponse.json({ error: "Keine Berechtigung für diese Org-Einheit." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "CLUB_WIDE_STRATEGY_CONFLICT") {
      return NextResponse.json(
        {
          error:
            "Es existiert bereits eine Gesamtverein-Strategie. Mehrere getrennt betitelte Strategien mit Gesamtverein-Scope sind nach Anwendung der Datenbank-Erweiterung aus diesem Release möglich.",
        },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "RESPONSIBLE_NOT_FOUND") {
      return NextResponse.json({ error: "Verantwortliche Person nicht gefunden." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_NEXT_REVIEW") {
      return NextResponse.json({ error: "Ungültiges Datum für die nächste Überprüfung." }, { status: 400 });
    }
    console.error("club-strategies POST failed", error);
    return NextResponse.json({ error: "Strategie konnte nicht angelegt werden." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const clubStrategyId =
    typeof body?.clubStrategyId === "string"
      ? body.clubStrategyId.trim()
      : typeof body?.strategyId === "string"
        ? body.strategyId.trim()
        : "";
  const orgUnitIds = Array.isArray(body?.orgUnitIds)
    ? body.orgUnitIds
        .filter((v: unknown): v is string => typeof v === "string")
        .map((id: string) => id.trim())
    : [];

  if (!clubStrategyId) {
    return NextResponse.json({ error: "clubStrategyId ist erforderlich." }, { status: 400 });
  }

  try {
    await replaceClubStrategyOrgUnitAssignments(access.context.actor, access.context.actorUserId, {
      clubStrategyId,
      orgUnitIds,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "STRATEGY_NOT_FOUND") {
      return NextResponse.json({ error: "Strategie nicht gefunden." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "ORG_UNIT_NOT_FOUND") {
      return NextResponse.json({ error: "Org-Einheit nicht gefunden." }, { status: 400 });
    }
    return NextResponse.json({ error: "Org-Einheiten konnten nicht gespeichert werden." }, { status: 500 });
  }
}