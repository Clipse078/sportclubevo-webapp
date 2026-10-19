import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { updateTournamentPitch } from "@/lib/tournament-scheduling/tournament-pitch-service";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";

type RouteContext = { params: Promise<{ tournamentId: string; pitchId: string }> };

/** Updates pitch metadata (incl. optional Spielform) without mutating fixtures or schedule assignments. */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const tenant = await getActiveTenant();
  const { tournamentId, pitchId } = await params;
  const body = (await request.json()) as {
    label?: string;
    playersPerSide?: number | null;
  };

  try {
    await updateTournamentPitch(tenantId, tournamentId, pitchId, {
      label: body.label,
      playersPerSide: body.playersPerSide,
    });

    const viewModel = await loadTournamentPlanungViewModel({
      tenantId,
      tournamentId,
      timezone: tenant?.timezone ?? "Europe/Zurich",
      tenantName: tenant?.name ?? null,
      tenantLogoUrl: tenant?.logoUrl ?? null,
    });

    return NextResponse.json({ viewModel });
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
