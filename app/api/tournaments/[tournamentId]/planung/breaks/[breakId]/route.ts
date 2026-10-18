import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  deletePlanungOperationalBreak,
  updatePlanungOperationalBreak,
} from "@/lib/tournaments/planung/planung-operational-config-service";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";

type RouteContext = { params: Promise<{ tournamentId: string; breakId: string }> };

async function reloadViewModel(tenantId: string, tournamentId: string) {
  const tenant = await getActiveTenant();
  return loadTournamentPlanungViewModel({
    tenantId,
    tournamentId,
    timezone: tenant?.timezone ?? "Europe/Zurich",
    tenantName: tenant?.name ?? null,
    tenantLogoUrl: tenant?.logoUrl ?? null,
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, breakId } = await params;
  const body = (await request.json()) as {
    label?: string | null;
    startLocalTime?: string;
    durationMinutes?: number;
    scope?: "ALL_PITCHES" | "SELECTED_PITCHES";
    tournamentPitchIds?: string[];
  };

  if (!body.startLocalTime || body.durationMinutes == null) {
    return NextResponse.json(
      { error: "startLocalTime and durationMinutes are required." },
      { status: 400 },
    );
  }

  try {
    await updatePlanungOperationalBreak({
      tenantId,
      tournamentId,
      breakId,
      draft: {
        label: body.label,
        startLocalTime: body.startLocalTime,
        durationMinutes: body.durationMinutes,
        scope: body.scope ?? "ALL_PITCHES",
        tournamentPitchIds: body.tournamentPitchIds,
      },
    });

    const viewModel = await reloadViewModel(tenantId, tournamentId);
    return NextResponse.json({ viewModel });
  } catch (err) {
    if (err instanceof TournamentSchedulingError && err.code === "TOURNAMENT_GENERATION_INVALID") {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, breakId } = await params;

  try {
    await deletePlanungOperationalBreak({ tenantId, tournamentId, breakId });
    const viewModel = await reloadViewModel(tenantId, tournamentId);
    return NextResponse.json({ viewModel });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
