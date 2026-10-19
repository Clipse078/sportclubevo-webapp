import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { updateTournamentPitch } from "@/lib/tournament-scheduling/tournament-pitch-service";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";

type RouteContext = { params: Promise<{ tournamentId: string; pitchId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, pitchId } = await params;
  const body = (await request.json()) as {
    label?: string;
    displayOrder?: number;
    playersPerSide?: number | null;
  };

  try {
    const pitch = await updateTournamentPitch(tenantId, tournamentId, pitchId, {
      label: body.label,
      displayOrder: body.displayOrder,
      playersPerSide: body.playersPerSide,
    });
    return NextResponse.json({ pitch });
  } catch (err) {
    if (err instanceof TournamentSchedulingError) {
      if (err.code === "TOURNAMENT_COMPETITION_VALIDATION") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
      }
    }
    if (err instanceof Error && err.message === "Tournament pitch not found") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
