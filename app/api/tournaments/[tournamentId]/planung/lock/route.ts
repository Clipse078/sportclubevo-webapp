import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { setTournamentFixtureAssignmentScheduleLock } from "@/lib/tournament-scheduling/assignment-service";
import { loadTournamentPlanungViewModel } from "@/lib/tournaments/planung/load-tournament-planung.server";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import type { TournamentFixtureScheduleLockDimension } from "@/lib/tournament-scheduling/types";

type RouteContext = { params: Promise<{ tournamentId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  const userId = access.session.user?.effectiveUserId ?? access.session.user?.id ?? null;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const tenant = await getActiveTenant();
  const { tournamentId } = await params;
  const body = (await request.json()) as {
    assignmentId?: string;
    dimension?: TournamentFixtureScheduleLockDimension | null;
    expectedRevision?: number;
  };

  if (!body.assignmentId) {
    return NextResponse.json({ error: "assignmentId is required." }, { status: 400 });
  }

  try {
    await setTournamentFixtureAssignmentScheduleLock(
      tenantId,
      body.assignmentId,
      body.dimension ?? null,
      userId,
      { expectedRevision: body.expectedRevision },
    );

    const viewModel = await loadTournamentPlanungViewModel({
      tenantId,
      tournamentId,
      timezone: tenant?.timezone ?? "Europe/Zurich",
      tenantName: tenant?.name ?? null,
      tenantLogoUrl: tenant?.logoUrl ?? null,
    });

    return NextResponse.json({ viewModel });
  } catch (err) {
    if (err instanceof TournamentSchedulingError && err.code === "SCHEDULE.STALE_VERSION") {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    throw err;
  }
}
