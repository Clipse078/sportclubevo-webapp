import { NextRequest, NextResponse } from "next/server";
import { loadVorhabenWorkspacePanel } from "@/lib/club-development/vorhaben-workspace-card";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const returnTo = req.nextUrl.searchParams.get("returnTo")?.trim() || undefined;

  const panel = await loadVorhabenWorkspacePanel(access.context.actor, id, { returnTo });
  if (!panel) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ panel });
}