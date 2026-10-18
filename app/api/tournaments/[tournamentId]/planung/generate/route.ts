import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  runInitialTournamentScheduleGeneration,
  TournamentPlanungIncompleteError,
} from "@/lib/tournament-scheduling/tournament-schedule-orchestration-service";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";
import type { TournamentPlanungGenerationOutcome } from "@/lib/tournaments/planung/types";
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
    const result = await runInitialTournamentScheduleGeneration({
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
      regenerationMetrics: result.optimisation.changeMetrics ?? undefined,
    });

    const succeeded =
      result.optimisation.status !== "INFEASIBLE_PROVEN" &&
      result.optimisation.assignments.length > 0;
    const generation: TournamentPlanungGenerationOutcome = {
      attempted: true,
      succeeded,
      optimisationStatus: result.optimisation.status,
      guidance: succeeded ? null : viewModel.feasibilityGuidance,
    };

    return NextResponse.json({ viewModel, generation });
  } catch (err) {
    if (err instanceof TournamentPlanungIncompleteError) {
      return NextResponse.json(
        { error: err.message, missing: err.missing },
        { status: 422 },
      );
    }
    if (err instanceof TournamentSchedulingError && err.code === "SCHEDULE.STALE_VERSION") {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    throw err;
  }
}
