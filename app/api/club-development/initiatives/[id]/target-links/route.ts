import { NextRequest, NextResponse } from "next/server";
import {
  InitiativeMilestoneTenantError,
  linkInitiativeTarget,
  listInitiativeTargetLinks,
  unlinkInitiativeTarget,
} from "@/lib/club-development/initiative-target-links";
import { getInitiativeBacklogItem } from "@/lib/club-development/initiative-backlog";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const { id } = await params;
  const initiative = await getInitiativeBacklogItem(access.context.actor, id);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }
  const links = await listInitiativeTargetLinks(access.context.tenantId, id);
  return NextResponse.json({ links });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TARGETS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const { id } = await params;
  const initiative = await getInitiativeBacklogItem(access.context.actor, id);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetId = (body?.targetId ?? "").trim();
    if (!targetId) {
      return NextResponse.json({ error: "targetId ist erforderlich." }, { status: 400 });
    }
    const link = await linkInitiativeTarget(access.context.tenantId, id, targetId);
    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    if (err instanceof InitiativeMilestoneTenantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TARGETS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const { id } = await params;
  const initiative = await getInitiativeBacklogItem(access.context.actor, id);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }

  const targetId =
    req.nextUrl.searchParams.get("targetId")?.trim() ||
    (await req.json().catch(() => ({})))?.targetId?.trim();
  if (!targetId) {
    return NextResponse.json({ error: "targetId ist erforderlich." }, { status: 400 });
  }

  try {
    await unlinkInitiativeTarget(access.context.tenantId, id, targetId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InitiativeMilestoneTenantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
