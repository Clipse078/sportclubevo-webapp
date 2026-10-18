import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  applyCanonicalPlanungRecommendedTiming,
  TournamentPlanungIncompleteError,
} from "@/lib/tournament-scheduling/tournament-schedule-orchestration-service";
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
  let body: { expectedRevision?: number } = {};
  try {
    body = (await request.json()) as { expectedRevision?: number };
  } catch {
    body = {};
  }

  try {
    await applyCanonicalPlanungRecommendedTiming({
      tenantId,
      tournamentId,
      expectedRevision: body.expectedRevision,
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
    if (err instanceof TournamentPlanungIncompleteError) {
      return NextResponse.json(
        { error: err.message, missing: err.missing },
        { status: 422 },
      );
    }
    if (err instanceof TournamentSchedulingError) {
      if (err.code === "SCHEDULE.STALE_VERSION") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
      }
      if (err.code === "TOURNAMENT_GENERATION_INVALID") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
      }
    }
    throw err;
  }
}
