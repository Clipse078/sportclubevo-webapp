import { NextRequest, NextResponse } from "next/server";
import {
  InitiativeTargetLinkError,
  linkInitiativeTarget,
  listTargetInitiativeLinks,
  unlinkInitiativeTarget,
} from "@/lib/club-development/initiative-target-links";
import { canActorSeeInitiative } from "@/lib/club-development/strategy-overview";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { requireTargetAccess } from "@/lib/visibility/visibility-guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_VIEW,
    PERMISSIONS.TARGETS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id: targetId } = await params;
  const guard = await requireTargetAccess({
    actor: access.context.actor,
    id: targetId,
    access: "read",
  });
  if (!guard.ok) return guard.response;

  const rows = await listTargetInitiativeLinks(access.context.tenantId, targetId);
  const links = [];
  for (const row of rows) {
    const visible = await canActorSeeInitiative(access.context.actor, row.initiative.id);
    if (!visible) continue;
    links.push({
      id: row.id,
      initiativeId: row.initiative.id,
      initiative: {
        id: row.initiative.id,
        slug: row.initiative.slug,
        title: row.initiative.title,
        status: row.initiative.status,
      },
    });
  }

  return NextResponse.json({ links });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_MANAGE,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id: targetId } = await params;
  const guard = await requireTargetAccess({
    actor: access.context.actor,
    id: targetId,
    access: "write",
  });
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const initiativeId = typeof body?.initiativeId === "string" ? body.initiativeId.trim() : "";
  if (!initiativeId) {
    return NextResponse.json({ error: "initiativeId ist erforderlich." }, { status: 400 });
  }

  const canSee = await canActorSeeInitiative(access.context.actor, initiativeId);
  if (!canSee) {
    return NextResponse.json({ error: "Vorhaben nicht sichtbar." }, { status: 404 });
  }

  try {
    const link = await linkInitiativeTarget(access.context.tenantId, initiativeId, targetId);
    return NextResponse.json(
      {
        link: {
          id: link.id,
          initiativeId: link.initiativeId,
          initiative: link.initiative,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof InitiativeTargetLinkError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_MANAGE,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id: targetId } = await params;
  const guard = await requireTargetAccess({
    actor: access.context.actor,
    id: targetId,
    access: "write",
  });
  if (!guard.ok) return guard.response;

  const initiativeId =
    req.nextUrl.searchParams.get("initiativeId")?.trim() ||
    (await req.json().catch(() => ({})))?.initiativeId?.trim();
  if (!initiativeId) {
    return NextResponse.json({ error: "initiativeId ist erforderlich." }, { status: 400 });
  }

  try {
    await unlinkInitiativeTarget(access.context.tenantId, initiativeId, targetId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InitiativeTargetLinkError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}