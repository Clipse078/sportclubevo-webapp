import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { runTournamentScheduleRegeneration } from "@/lib/tournament-scheduling/tournament-schedule-orchestration-service";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";

type RouteContext = { params: Promise<{ tournamentId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const tenant = await getActiveTenant();
  const { tournamentId } = await params;
  const body = (await request.json()) as {
    scheduleVersionId?: string;
    expectedRevision?: number;
  };

  if (!body.scheduleVersionId) {
    return NextResponse.json({ error: "scheduleVersionId is required." }, { status: 400 });
  }

  try {
    const result = await runTournamentScheduleRegeneration({
      tenantId,
      tournamentId,
      scheduleVersionId: body.scheduleVersionId,
      expectedRevision: body.expectedRevision,
    });

    const viewModel = await loadTournamentPlanungViewModel({
      tenantId,
      tournamentId,
      timezone: tenant?.timezone ?? "Europe/Zurich",
      tenantName: tenant?.name ?? null,
      tenantLogoUrl: tenant?.logoUrl ?? null,
      regenerationMetrics: result.regeneration.changeMetrics ?? undefined,
    });

    return NextResponse.json({
      viewModel,
      lockConflicts: result.regeneration.lockConflictDiagnostics,
      status: result.regeneration.status,
    });
  } catch (err) {
    if (err instanceof TournamentSchedulingError && err.code === "SCHEDULE.STALE_VERSION") {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    throw err;
  }
}
